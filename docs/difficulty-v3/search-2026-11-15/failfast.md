# Fail-fast false-stop check (MP12b2)

Files evaluated: 33; completed baselines (an end event): 26; censored captures (stopped at their limit): 7.
F2 fires on a selection call whose first four raw attempts are all capped (false stop when the call returned a result).
F1 fires at the first set attempt whose raw attempts are not empty and all capped (false stop when that set attempt or a later one was ok;
a correct stop in a completed baseline; unknown in a censored tail). F1 + F2 reads each set attempt as F2 has cut it and stops the walk at an F2 false stop;
when F1 never fires, F2 cuts of batch calls are judged as for F2.

## Mechanisms

| Mechanism | Files evaluated | Completed baselines evaluated | Triggers | Observed false stops | Correct stops | Unknown outcomes | Reading |
|---|---|---|---|---|---|---|---|
| F2 | 33 | 26 | 67 | 17 | 50 | 0 | not proposable: 17 observed false stop(s) |
| F1 | 33 | 26 | 7 | 2 | 0 | 5 | not proposable: 2 observed false stop(s) |
| F1 + F2 | 33 | 26 | 21 | 5 | 11 | 5 | not proposable: 5 observed false stop(s) |

## Per file

| File | Population | Completed baseline | Calls | F2 triggers/false/correct | F1 triggers/false/correct/unknown | F1 + F2 triggers/false/correct/unknown | Set stage observed (s) | F1 stop at (s) | F1 + F2 stop at (s) | F2 time saved on cut calls (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| r-18x20-expert.jsonl | require | yes | 16 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.5 | - | - | - |
| r-18x20-hard.jsonl | require | yes | 27 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 17.5 | - | - | - |
| r-18x20-master.jsonl | require | yes | 17 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 73.5 | - | - | - |
| r-6x10-easy.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| r-6x10-expert.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.8 | - | - | - |
| r-6x10-hard.jsonl | require | yes | 11 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| r-6x10-master.jsonl | require | yes | 12 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 6.4 | - | - | - |
| r-6x10-normal.jsonl | require | yes | 10 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-10x10-expert.jsonl | any | yes | 6 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.8 | - | - | - |
| a-10x10-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.0 | - | - | - |
| a-10x10-master.jsonl | any | yes | 6 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 1.2 | - | - | - |
| a-12x12-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-12x12-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-12x12-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.5 | - | - | - |
| a-18x20-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-18x20-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.2 | - | - | - |
| a-18x20-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 1.0 | - | - | - |
| a-6x10-expert.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.1 | - | - | - |
| a-6x10-hard.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.0 | - | - | - |
| a-6x10-master.jsonl | any | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 0.3 | - | - | - |
| h-15x20-hell-2.jsonl | hell | no | 6 | 6/0/6 | 1/0/0/1 | 1/0/0/1 | censored | 82.8 | 8.4 | 198.7 |
| h-18x18-hell-2.jsonl | hell | no | 4 | 3/0/3 | 1/0/0/1 | 1/0/0/1 | censored | 42.7 | 8.5 | 101.0 |
| h-22x22-hell-3.jsonl | hell | no | 5 | 5/0/5 | 1/0/0/1 | 1/0/0/1 | censored | 43.1 | 9.1 | 160.6 |
| h-24x24-hell-3.jsonl | hell | no | 6 | 6/0/6 | 1/0/0/1 | 1/0/0/1 | censored | 46.0 | 9.6 | 221.9 |
| h-32x15-hell-3.jsonl | hell | no | 5 | 5/0/5 | 1/0/0/1 | 1/0/0/1 | censored | 51.9 | 17.4 | 174.7 |
| hl-14x14-hell-1.jsonl | hell-landscape | no | 5 | 1/0/1 | 0/0/0/0 | 1/0/1/0 | censored | - | - | 137.3 |
| hl-24x24-hell-1.jsonl | hell-landscape | no | 12 | 10/0/10 | 0/0/0/0 | 10/0/10/0 | censored | - | - | 331.1 |
| hl-26x26-hell-1.jsonl | hell-landscape | yes | 17 | 13/6/7 | 1/1/0/0 | 1/1/0/0 | 315.3 | 42.0 | 9.1 | 369.7 |
| n-12x12-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 4.4 | - | - | 57.5 |
| n-14x14-nightmare.jsonl | nightmare | yes | 12 | 11/4/7 | 1/1/0/0 | 1/1/0/0 | 59.7 | 41.0 | 7.9 | 437.1 |
| n-15x15b10-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 18.8 | - | - | 9.9 |
| n-15x20-nightmare.jsonl | nightmare | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.8 | - | - | - |
| n-16x16-nightmare.jsonl | nightmare | yes | 5 | 5/5/0 | 0/0/0/0 | 1/1/0/0 | 19.7 | - | - | 88.1 |

## False stops and unknown outcomes

- h-15x20-hell-2.jsonl, F1: unknown at set attempt 1 (censored tail)
- h-15x20-hell-2.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-18x18-hell-2.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-18x18-hell-2.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-22x22-hell-3.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-22x22-hell-3.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-24x24-hell-3.jsonl, F1: unknown at set attempt 0 (censored tail)
- h-24x24-hell-3.jsonl, F1 + F2: unknown at set attempt 0 (censored tail)
- h-32x15-hell-3.jsonl, F1: unknown at set attempt 1 (censored tail)
- h-32x15-hell-3.jsonl, F1 + F2: unknown at set attempt 1 (censored tail)
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/2/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/3/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/6/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/7/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/9/0
- hl-26x26-hell-1.jsonl, F2: false stop at hl-26x26-hell-1/slot/10/0
- hl-26x26-hell-1.jsonl, F1: false stop at set attempt 0
- hl-26x26-hell-1.jsonl, F1 + F2: false stop at set attempt 0
- n-12x12-nightmare.jsonl, F2: false stop at n-12x12-nightmare/slot/2/0
- n-12x12-nightmare.jsonl, F1 + F2: false stop at n-12x12-nightmare/slot/2/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/set/1
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/2/2
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/3/0
- n-14x14-nightmare.jsonl, F2: false stop at n-14x14-nightmare/slot/5/2
- n-14x14-nightmare.jsonl, F1: false stop at set attempt 0
- n-14x14-nightmare.jsonl, F1 + F2: false stop at set attempt 0
- n-15x15b10-nightmare.jsonl, F2: false stop at n-15x15b10-nightmare/set/0
- n-15x15b10-nightmare.jsonl, F1 + F2: false stop at n-15x15b10-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/set/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/2/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/3/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/4/0
- n-16x16-nightmare.jsonl, F2: false stop at n-16x16-nightmare/slot/5/0
- n-16x16-nightmare.jsonl, F1 + F2: false stop at n-16x16-nightmare/set/0

## Per population

| Population | Files | Completed baselines | F2 triggers/false | F1 triggers/false/unknown | F1 + F2 triggers/false/unknown |
|---|---|---|---|---|---|
| require | 8 | 8 | 0/0 | 0/0/0 | 0/0/0 |
| any | 12 | 12 | 0/0 | 0/0/0 | 0/0/0 |
| hell | 5 | 0 | 25/0 | 5/0/5 | 5/0/5 |
| hell-landscape | 3 | 1 | 24/6 | 1/1/0 | 12/1/0 |
| nightmare | 5 | 5 | 18/11 | 1/1/0 | 4/4/0 |

## Diagnostic: leading capped raw attempts of the calls that returned a result

Not a mechanism and not a proposal: how many raw attempts of a call were capped before its first rated one, among the calls that returned a result (a stop after n capped attempts is a false stop for each call at or above n).

| Population | Calls with a result | Calls with no leading capped attempt | Leading capped >= 4 | >= 8 | >= 12 | >= 16 | >= 20 | Largest |
|---|---|---|---|---|---|---|---|---|
| require | 74 | 74 | 0 | 0 | 0 | 0 | 0 | 0 |
| any | 62 | 62 | 0 | 0 | 0 | 0 | 0 | 0 |
| hell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - |
| hell-landscape | 14 | 0 | 6 | 3 | 0 | 0 | 0 | 9 |
| nightmare | 25 | 4 | 11 | 7 | 3 | 2 | 0 | 18 |

The times are those of serial captures: F1 stop at = the set attempts up to and including the firing one; F1 + F2 stop at = the same with the firing attempt cut after its first four ratings;
the saving of F2 on a cut call = its time minus the time of its first four ratings. They are counterfactual estimates, never measurements of a built mechanism.

