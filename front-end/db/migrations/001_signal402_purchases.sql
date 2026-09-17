begin;

create schema if not exists signal402;

create table if not exists signal402.paid_purchase_replays (
  schema_version text not null default 'signal402.replay.v1',
  purchase_key bytea primary key,
  credential_digest bytea not null unique,
  request_fingerprint bytea not null,
  state text not null,
  version bigint not null default 0,
  response_body bytea,
  response_body_sha256 bytea,
  settlement_header text,
  payment_network text,
  payment_tx_hash bytea,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  expires_at timestamptz not null,

  constraint paid_purchase_schema_v1
    check (schema_version = 'signal402.replay.v1'),
  constraint paid_purchase_hash_lengths
    check (
      octet_length(purchase_key) = 32
      and octet_length(credential_digest) = 32
      and octet_length(request_fingerprint) = 32
      and (
        response_body_sha256 is null
        or octet_length(response_body_sha256) = 32
      )
      and (
        payment_tx_hash is null
        or octet_length(payment_tx_hash) = 32
      )
    ),
  constraint paid_purchase_state
    check (
      state in (
        'verifying',
        'processing',
        'prepared',
        'settling',
        'settled',
        'failed_retryable',
        'outcome_unknown'
      )
    ),
  constraint paid_purchase_version check (version >= 0),
  constraint paid_purchase_times
    check (updated_at >= created_at and expires_at > created_at),
  constraint paid_purchase_prepared_pair
    check ((response_body is null) = (response_body_sha256 is null)),
  constraint paid_purchase_receipt_group
    check (
      (settlement_header is null)
      = (payment_network is null)
      and (settlement_header is null) = (payment_tx_hash is null)
    ),
  constraint paid_purchase_state_payload
    check (
      (
        state in ('verifying', 'processing')
        and response_body is null
        and settlement_header is null
      )
      or (
        state in ('prepared', 'settling', 'outcome_unknown')
        and response_body is not null
        and settlement_header is null
      )
      or (
        state = 'settled'
        and response_body is not null
        and settlement_header is not null
      )
      or (
        state = 'failed_retryable'
        and settlement_header is null
      )
    )
);

create index if not exists paid_purchase_replays_expires_at_idx
  on signal402.paid_purchase_replays (expires_at);

create or replace function signal402.claim_purchase(
  p_purchase_key bytea,
  p_credential_digest bytea,
  p_request_fingerprint bytea,
  p_now timestamptz,
  p_expires_at timestamptz
)
returns table (
  result_kind text,
  schema_version text,
  purchase_key bytea,
  credential_digest bytea,
  request_fingerprint bytea,
  state text,
  version bigint,
  response_body bytea,
  response_body_sha256 bytea,
  settlement_header text,
  payment_network text,
  payment_tx_hash bytea,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_lock_id bigint;
  v_row signal402.paid_purchase_replays%rowtype;
  v_result_kind text;
begin
  if p_now is null or p_expires_at <= p_now then
    raise exception 'invalid replay timestamps' using errcode = '22007';
  end if;

  for v_lock_id in
    select lock_id
    from unnest(array[
      hashtextextended('purchase:' || encode(p_purchase_key, 'hex'), 0),
      hashtextextended('credential:' || encode(p_credential_digest, 'hex'), 0)
    ]) as locks(lock_id)
    order by lock_id
  loop
    perform pg_advisory_xact_lock(v_lock_id);
  end loop;

  delete from signal402.paid_purchase_replays
  where expires_at <= p_now
    and (
      purchase_key = p_purchase_key
      or credential_digest = p_credential_digest
    );

  insert into signal402.paid_purchase_replays (
    purchase_key,
    credential_digest,
    request_fingerprint,
    state,
    version,
    created_at,
    updated_at,
    expires_at
  ) values (
    p_purchase_key,
    p_credential_digest,
    p_request_fingerprint,
    'verifying',
    0,
    p_now,
    p_now,
    p_expires_at
  )
  on conflict do nothing
  returning * into v_row;

  if found then
    v_result_kind := 'claimed';
  else
    select * into v_row
    from signal402.paid_purchase_replays as replay
    where replay.purchase_key = p_purchase_key
       or replay.credential_digest = p_credential_digest
    order by (replay.purchase_key = p_purchase_key) desc
    limit 1;

    if not found then
      raise exception 'replay claim serialization failure'
        using errcode = '40001';
    elsif v_row.purchase_key = p_purchase_key then
      if v_row.credential_digest = p_credential_digest
        and v_row.request_fingerprint = p_request_fingerprint then
        v_result_kind := 'existing_match';
      else
        v_result_kind := 'purchase_key_mismatch';
      end if;
    else
      v_result_kind := 'credential_reused';
    end if;
  end if;

  return query select
    v_result_kind,
    v_row.schema_version,
    v_row.purchase_key,
    v_row.credential_digest,
    v_row.request_fingerprint,
    v_row.state,
    v_row.version,
    v_row.response_body,
    v_row.response_body_sha256,
    v_row.settlement_header,
    v_row.payment_network,
    v_row.payment_tx_hash,
    v_row.created_at,
    v_row.updated_at,
    v_row.expires_at;
end;
$$;

comment on table signal402.paid_purchase_replays is
  'Short-lived Signal402 replay records; never store raw payment signatures or idempotency keys.';
comment on function signal402.claim_purchase(bytea, bytea, bytea, timestamptz, timestamptz) is
  'Atomically claims a purchase tuple after serializing purchase and credential identities.';

revoke all on schema signal402 from public;
revoke all on table signal402.paid_purchase_replays from public;
revoke all on function signal402.claim_purchase(bytea, bytea, bytea, timestamptz, timestamptz) from public;

commit;
