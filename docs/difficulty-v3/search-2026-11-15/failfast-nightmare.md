# Fail-fast false-stop check (MP12b2)

Files evaluated: 5; completed baselines (an end event): 5; censored captures (stopped at their limit): 0.
F2 fires on a selection call whose first four raw attempts are all capped (false stop when the call returned a result).
F1 fires at the first set attempt whose raw attempts are not empty and all capped (false stop when that set attempt or a later one was ok;
a correct stop in a completed baseline; unknown in a censored tail). F1 + F2 reads each set attempt as F2 has cut it and stops the walk at an F2 false stop;
when F1 never fires, F2 cuts of batch calls are judged as for F2.

## Mechanisms

| Mechanism | Files evaluated | Completed baselines evaluated | Triggers | Observed false stops | Correct stops | Unknown outcomes | Reading |
|---|---|---|---|---|---|---|---|
| F2 | 5 | 5 | 18 | 11 | 7 | 0 | not proposable: 11 observed false stop(s) |
| F1 | 5 | 5 | 1 | 1 | 0 | 0 | not proposable: 1 observed false stop(s) |
| F1 + F2 | 5 | 5 | 4 | 4 | 0 | 0 | not proposable: 4 observed false stop(s) |

## Per file

| File | Population | Completed baseline | Calls | F2 triggers/false/correct | F1 triggers/false/correct/unknown | F1 + F2 triggers/false/correct/unknown | Set stage observed (s) | F1 stop at (s) | F1 + F2 stop at (s) | F2 time saved on cut calls (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| n-12x12-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 4.4 | - | - | 57.5 |
| n-14x14-nightmare.jsonl | nightmare | yes | 12 | 11/4/7 | 1/1/0/0 | 1/1/0/0 | 59.7 | 41.0 | 7.9 | 437.1 |
| n-15x15b10-nightmare.jsonl | nightmare | yes | 5 | 1/1/0 | 0/0/0/0 | 1/1/0/0 | 18.8 | - | - | 9.9 |
| n-15x20-nightmare.jsonl | nightmare | yes | 5 | 0/0/0 | 0/0/0/0 | 0/0/0/0 | 2.8 | - | - | - |
| n-16x16-nightmare.jsonl | nightmare | yes | 5 | 5/5/0 | 0/0/0/0 | 1/1/0/0 | 19.7 | - | - | 88.1 |

## False stops and unknown outcomes

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
| nightmare | 5 | 5 | 18/11 | 1/1/0 | 4/4/0 |

## Diagnostic: leading capped raw attempts of the calls that returned a result

Not a mechanism and not a proposal: how many raw attempts of a call were capped before its first rated one, among the calls that returned a result (a stop after n capped attempts is a false stop for each call at or above n).

| Population | Calls with a result | Calls with no leading capped attempt | Leading capped >= 4 | >= 8 | >= 12 | >= 16 | >= 20 | Largest |
|---|---|---|---|---|---|---|---|---|
| nightmare | 25 | 4 | 11 | 7 | 3 | 2 | 0 | 18 |

The times are those of serial captures: F1 stop at = the set attempts up to and including the firing one; F1 + F2 stop at = the same with the firing attempt cut after its first four ratings;
the saving of F2 on a cut call = its time minus the time of its first four ratings. They are counterfactual estimates, never measurements of a built mechanism.

