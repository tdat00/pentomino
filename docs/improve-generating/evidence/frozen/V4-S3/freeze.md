> **Frozen source `3fc65f4`.** Measured on frozen 3fc65f4 (source digest e181df2c…). Re-run: pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S3.json -Label frozen -SourceLabel <label> -LockHelper <path>.

# The freeze of stage 3 (V4-S3)

## Classes

| Class | Cells | Bounds | W_screen |
|---|---|---|---|
| n-small | 3x29-nightmare, 10x10-nightmare, 12x12-nightmare | nightmare 1-144 | none |
| n-mid | 14x14-nightmare, 15x15b10-nightmare, 16x16-nightmare | nightmare 196-256 | 190 M |
| n-upper | 15x20-nightmare, 18x18-nightmare | nightmare 257-324 | 190 M |
| n-large | 18x20-nightmare, 20x20-nightmare, 20x21-nightmare, 32x15-nightmare, 22x22-nightmare, 24x24-nightmare, 26x26-nightmare | nightmare 360+ | 190 M |
| hell-1 | 14x14-hell-1, 20x20-hell-1, 24x24-hell-1, 26x26-hell-1 | hell-1 1+ | none |

## Tables

| Table | Id |
|---|---|
| screen | screen-s3-v1 |
| prior | prior-s3-v1 |
| budget | budget-s3-v1 |
| deadline | deadline-s3-v1 |

The prior `prior-s3-v1`: the 12 Hell 1 shares below and the 15 Nightmare entries of prior-v1.

### Hell 1 shares of the prior

| Cell | Case | Share | Windows | Source |
|---|---|---|---|---|
| hell-1@196 | 14x14-hell-1 | 0.4 | 68 | V4-S2 fr-base window share |
| hell-1@215 | 15x15b10-hell-1 | 0.404412 | 3 | IGP-05 window share |
| hell-1@256 | 16x16-hell-1 | 0.358108 | 3 | IGP-05 window share |
| hell-1@300 | 15x20-hell-1 | 0.443429 | 4 | IGP-05 window share |
| hell-1@324 | 18x18-hell-1 | 0.347222 | 6 | IGP-05 window share |
| hell-1@360 | 18x20-hell-1 | 0.331514 | 6 | IGP-05 window share |
| hell-1@400 | 20x20-hell-1 | 0.368421 | 75 | V4-S2 fr-base window share |
| hell-1@420 | 20x21-hell-1 | 0.390244 | 3 | IGP-05 window share |
| hell-1@480 | 32x15-hell-1 | 0.297161 | 6 | IGP-05 window share |
| hell-1@484 | 22x22-hell-1 | 0.2875 | 5 | IGP-05 window share |
| hell-1@576 | 24x24-hell-1 | 0.219512 | 70 | V4-S2 fr-base window share |
| hell-1@676 | 26x26-hell-1 | 0.2 | 64 | V4-S2 fr-base window share |

## Call budget

| Mode | Nightmare | Hell 1 |
|---|---|---|
| any | 10 G | 40 G |
| require | 32 G | 40 G |

## Bound, deadline and mechanisms

- The set-attempts bound: 4.
- The deadline: reserve 0.6, set-stage cap 46000 ms, generation stop 115000 ms, response bound 120000 ms.
- The mechanisms: `c4` off, rescue re-rating with `rerateMax` 4, no ranker, the per-set prior on hell-1 only, the reference kernel.

## Variants

| Variant | Tree id | Parameter hash |
|---|---|---|
| fr-frozen | b3e530b1bca515e551f240faccc327f9868da0f475a60761986faf4884b781f7 | 8d88421dd28da637585e3add86da5d69b7a780dbc3115fc67967ca25b206bd19 |
| fr-frozen-none | fa903f397ef6dce86ef70f3afb771c5de258b12836ae314bf796dbbf798ec6b3 | 2fb012457857019b1b6a08cc1a7a2d6cf3147b3682c838c6d1351a688b0c528c |
| fr-frozen-uncapped | 96ef38e2fd6d8f0ad07f1858275377f5d4bf788d7a2ae4cd80a813afdd829599 | a65b581dff5d038446347400c16669d15ca1b383b0aa428d091b5409a5a0f5bc |
| fr-frozen-none-uncapped | e31d829dee8d15a58c3e0d796afa35665222cd30fa707f3a52c5e5f868e6779c | bedc1ecdfde3ecd52cccc9dfaa0da8ed5136ada5bdebb88ad34a96279bec08cf |

## Seeds

### Used

- V4-S2 (fr-base, fr-screen, fr-none, fr-close, fr-c4, fr-ps, fr-p5): reps [0,1,2,3,4]
- V4-S2B (fr-none): reps [0,1,2,3,4]
- V4-S3P (fr-frozen-none-uncapped): reps [0,1,2,3,4]
- MP12b1: reps "landscape reps 0-19 of docs/difficulty-v3/landscape-v3-full (today's search)"
- IGP-05: reps "PM1's first slice (ig-pm1/...)"
- V4-S2K, V4-T10a-c: reps "the kernel streams ig-v4/kernel/<case>"

### Fitting

- landscape/<cell>/<rep>, reps 0-4: V4-S2, V4-S2B and the Hell 1 check of V4-S3P
- the provisional reps 0-5
- MP12b1 reps 0-19 (reps 10-19 fitted prior-v1)
- PM1's first slice (ig-pm1/...; IGP-05)
- R28
- the parity, replay and kernel streams (ig-v4/parity/..., ig-v4/replay/..., ig-v4/kernel/...)

### Excluded

- validation reps 20-39
- Master reps 20-24
- second validation reps 40-59

## The fit

The hash convention: sha256Lf: the SHA-256 of the UTF-8 text with every CRLF replaced by LF (lib/records.mjs sha256Text); the fit-read records name it sha256.

### Indices

| Fit index | Entries | SHA-256 |
|---|---|---|
| docs/improve-generating-stages-2-4/evidence/sa-astra/input-index.json | 1324 | 9771ea9a379af90645a61d9a388a310c7c127acc447a5cb92bb1f24cc1c2a0ca |
| docs/improve-generating-stages-2-4/evidence/sa-astra/review-input-index.json | 1251 | b2ea60862a9e21c5ca83b19f1c2cac3be53c788786424b7169ed95517cf15117 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.json | 39 | e2f80b1d1844dd72be2f7939351ae3314a6006bccef7ccae5d7f3663fcafa162 |
| docs/improve-generating-stages-2-4/evidence/sa-opus/fit-input-index.json | 2403 | 2fbbb4e3d898b0aa58334ebcb461be57d82bf64789f9ca39986824a37958412e |
| docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport-inputs.json | 145 | de2b3ae568c57f256fea71bf92921c3ad660ffffabc5303f26475f1042a5ea9f |
| docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection-inputs.json | 6 | 26445856a9352960d9a23325961bca1b1a0750ea45695c1a76683d16a8563c80 |
| docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json | 17 | 58ca83c4380ee5e5eeb78430f6de13dd8dcbdf267e120b6c7ded065a4793d856 |
| docs/improve-generating/evidence/frozen/V4-S2B/fit-read-prefixes-fr-none.json | 334 | b5d93dbe64274807970546d89ecfe3b0a88f601c191f305f43e168fbc37a7aa3 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.json | 8 | ab193f629dbed441b738bad597bb3734846ce0227014b6006f6c43fa18fc2573 |
| docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json | 173 | 081ca6ed4df44190674fa2860efb1b59f97774761eeaa3aaa4f6d84a495e3a07 |

### Files

| Fit file | SHA-256 |
|---|---|
| tools/ig-proto/freeze.mjs | a5789ed1a82f1f5cf10e7de79855a77ae4165ed0440046f9fda8448fad0443b4 |
| tools/ig-proto/fit-prior-s3.mjs | 4c6351acc67bdb2353a5335ccf1aae05ca1b40fe3977e9ef8119f921f843c3fa |
| tools/ig-proto/data/prior-s3-v1.json | 536dfd5d70dcdd3fa89f0b18141c161656e5ca968b7a18c52ec218c17cb1e0e1 |
| tools/ig-proto/data/prior-v1.json | e7291e5dfafff2a878b50663ac444922fdbf0b6a742153d077350d3895912133 |
| docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-14x14-hell-1.calls.jsonl | 478483580e1f49ba83249cb61540f1ef09c6fb95bf70efc23f5ad06c36a66384 |
| docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-20x20-hell-1.calls.jsonl | 26a60b21670e0b6b2672ff884664fc859a2b6b82ce96bd087918877b95cfa19c |
| docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-24x24-hell-1.calls.jsonl | 70c9e5f4c62ebc6bd44bac69e27144d0219654de95eb975575fdafac623e79f5 |
| docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-26x26-hell-1.calls.jsonl | b1c230b3d4a549480c7ba0757fde7b3401778f0496902ae4ab0781f4e861d8bc |
| docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl | 469fb5094a7d366b191ae457d4d48d555a4288403f1623ff5c8a46adaabad552 |
| docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl | 01e0e8286c9d2ac5b89c4166a460f75855db4b89365eb05dec7eabf62f1cb666 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/analyze-records.mjs | 8d0b1b607fe1296181457a0f114126db85d0c4ee9164287195706b301dde1174 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.mjs | 84601a74eb3f5e2c7881c8faa990c93e7f8b0c43f183cc2e4d39e88e9f8388a2 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.mjs | 49144724c834e464e2fe886c6c47896bebdce49f263ffe9f2558b998d3095ee1 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.json | 379e7c8793c3d130e3c8cabc5fba5682994b59e25bbcbf60ee20b6c376cb8b65 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.md | 72c568204f3dd0090449a3f3ff9b32bac2b3f2e09d178ee22a3e94966e4dbb8f |
| docs/improve-generating-stages-2-4/evidence/sa-astra/rows-computed.json | ab911184885ced042d3300d495c0b8d098810cf104ef21dca16dbc6b89bdbe15 |
| docs/improve-generating-stages-2-4/evidence/sa-astra/calls-computed.json | 99d3b383c2a0c199f33a524aeb94332660690e6217a7c7a8372d2b2e554d067d |
| docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.json | 40afa5416f82f6e0206fd482b9e5f0234199bfba66ff089bef75109fed02494f |
| docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs | 7adbafa9cae703a8ded5d34357a54ee2fa8e890844ef0a01f019e11f3db59765 |
| docs/improve-generating-stages-2-4/evidence/sa-opus/bt-fit-index.mjs | 1ac42bc1c410fa936f57df67085d39e34f8090a6ab71f1915ce16f03a9acec33 |
| docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs | 6c66a6c69a9b4e1b956531fdd6b75aaf23fc534e78f03c1daf0d917b73e76830 |
| docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs | 5b8cb2b253e3de163c92ba642fce900e9de9bbc26306b75c816ccf0fe1093945 |
| docs/improve-generating-stages-2-4/report.md | 018d4d350bd9cd0e1b7ad33eee644def90db66de07a316bc57ae989745931800 |
| docs/improve-generating-stages-2-4/plan.md | 2fa90684e990179debe55eed21066d46f0cbd71d4a0bd41b3d150f7bb6499838 |
| docs/improve-generating-stages-2-4/s01-reading.md | 499dd68911a598037de05693663773a647e55c7d02b9c39779e471e68a17b92f |
| docs/improve-generating-stages-2-4/t11-reading.md | e5ca5784b6211fd01e815cff615a130080a156d38a5f85b4e627c92c21d832c4 |

### Captured sources

| Captured source | From | Captured at | sha256Lf |
|---|---|---|---|
| tools/ig-proto/lib/lane-worker.mjs | 57ef5cf | docs/improve-generating/evidence/frozen/V4-S3/fit-sources/tools/ig-proto/lib/lane-worker.mjs | 0f04190fc96b6bbb6a990aa6a081419ddceff50fcce9a765c556c8240b48aefe |
| tools/ig-proto/manifest.mjs | 57ef5cf | docs/improve-generating/evidence/frozen/V4-S3/fit-sources/tools/ig-proto/manifest.mjs | 75135bc251ed050d6cc97860d161f91a956d9f6a89b1a45cee45dacc5e28ce12 |
| tools/ig-proto/v4-check.mjs | 57ef5cf | docs/improve-generating/evidence/frozen/V4-S3/fit-sources/tools/ig-proto/v4-check.mjs | 16184834d4e680fb8a013df2e77c3dc1e8fa8433b659e3b8b46e27344a46c811 |

Entries checked: 5697.

## Proofs

| Proof | SHA-256 |
|---|---|
| docs/improve-generating/evidence/frozen/V4-S3P/parity-fr-frozen.accepted.json | 6e2a984ab8a460dbd0e887e4941eaf77420bad914bbd3650c0521b632c7e2315 |
| docs/improve-generating/evidence/frozen/V4-S3P/parity-fr-frozen-none.accepted.json | 8f6d5db4d479d716ccbe10423133de617fc50c640ba67ead8aaad55629813358 |
| docs/improve-generating/evidence/frozen/V4-S3P/parity-fr-frozen-uncapped.accepted.json | 73f7733fe8a6b66f7fcebd01863ee59c0763a5de29bbd5313a3f7b27064adc3d |
| docs/improve-generating/evidence/frozen/V4-S3P/parity-fr-frozen-none-uncapped.accepted.json | 244b0d242160eeb93abee57ebd8785496738793c934ff0ebf2c30970ad325c23 |
