# D21 measurements for RES-15 early stop (MP07, Hell 3 on 22x22)

Status: COMPLETE. Requested 2026-11-12 17:20 +07:00 by Fable (claude-fable-5-2) through the owner,
before the owner chooses (a), (b) or a combined option for check-list D21.
Measured by the MP07 developer (claude-sonnet-5.5) on the uncommitted MP07 working tree; the pre-MP07
comparison uses commit 60575a4. Measurement only: no change to the spec, product code, tests or fixtures.

## Questions (verbatim from Fable)

Gửi developer MP07 (pentomino, RES-15, D21). Chỉ đo và báo số, không sửa spec hay mã sản phẩm.
Dùng mã MP07 hiện tại, cùng seed với các lần chạy đã báo. Ghi lệnh đã chạy kèm kết quả.

A. Về ca Hell 3 trên 22x22 (flow square-22x22-hell-3)

1. Điểm 174 đến từ đâu? Cho K (số mảnh), số clue và U của các ứng viên trong dải, B và trạng thái
   saturated. Có phải mọi ứng viên trong dải đều đã bão hòa B và số clue đã ở mức tối thiểu không?
2. Với mỗi câu đố trong 3 câu của bản quantity 3: dãy điểm của cả 48 lượt chấm theo thứ tự
   (kèm số clue của từng lượt), lượt đầu tiên rơi vào dải là lượt thứ mấy, và lượt đạt điểm tốt nhất
   cuối cùng là lượt thứ mấy.
3. Trong 48 lượt đó có lượt nào nằm ở phía trên nửa giữa dải (điểm > 216,75) hoặc trên dải không?
   Hay tất cả đều ở dưới 180,25?
4. Thời gian: tổng thời gian mỗi câu đố, thời gian trung vị và lớn nhất của một lượt chấm,
   và phần thời gian nằm ngoài việc chấm (carve, LNS, kiểm tra duy nhất).
5. Cùng yêu cầu đó trên mã trước MP07 (dừng ở ứng viên đầu tiên trong dải): bao nhiêu lượt chấm
   mỗi câu đố, điểm của 10 câu, tổng thời gian. Mục đích là biết MP07 chậm hơn bao nhiêu lần.

B. Ca này có phổ biến không

6. Trong ma trận landscape (hoặc tập recipe/vector tham chiếu của MP07), những ô nào có tỉ lệ
   "dùng hết 48 lượt mà không có ứng viên nào trong nửa giữa dải" lớn hơn 0? Cho bảng:
   ô (bàn, mức) | số câu đố | số câu dùng hết 48 lượt | số lượt chấm trung vị | thời gian mỗi câu.
   Nếu chưa có số liệu, chạy tối thiểu: 10x6 hard/master, 12x12 master, 18x20 hard/master,
   22x22 hell-1/hell-2/hell-3, mỗi ô 5 câu, 1 seed.
7. Với các ô ở câu 6 có dùng hết 48 lượt: điểm tốt nhất nằm dưới hay trên nửa giữa dải?
   Có ô nào mà ứng viên nằm ở cả hai phía nhưng vẫn không trúng nửa giữa không?

C. Mô phỏng quy tắc dừng sớm (không cần cài vào sản phẩm; tính lại từ dãy điểm đã ghi qua onRate)

Quy tắc: đã có ít nhất một ứng viên trong dải; mọi ứng viên đã chấm đều nằm cùng một phía của
nửa giữa dải; và N lượt chấm liên tiếp không cho ứng viên nào gần tâm hơn thì dừng, trả về ứng viên
tốt nhất theo thứ tự ranked() hiện có.

8. Với N = 4, 8, 12, trên mọi câu đố của câu 2 và câu 6: quy tắc dừng ở lượt thứ mấy, điểm trả về
   là bao nhiêu, và điểm đó có khác điểm MP07 hiện trả về không?
9. Trên các vector tham chiếu và fixture mà MP07 đã khớp: với N = 8, có bao nhiêu trường hợp quy tắc
   kích hoạt, và bao nhiêu trường hợp kết quả (bộ clue hoặc điểm) thay đổi? Liệt kê các trường hợp đổi.
10. Có trường hợp nào quy tắc dừng sớm rồi bỏ lỡ một ứng viên trong nửa giữa dải mà MP07 hiện tại
    tìm được ở lượt sau không? Nếu có, cho ô, seed, lượt dừng và lượt MP07 tìm thấy.

D. Chi phí thực hiện

11. Nếu đưa quy tắc này vào MP09 (task vốn đã ghi lại fixture): ước lượng số dòng thay đổi, test cần
    thêm, và có phát sinh lần ghi lại fixture nào ngoài GF-P2 không?
12. Nếu thay vào đó làm lại ngay trong MP07: những gì phải chạy lại (vector, GF-P1, GA-P1) và mất
    khoảng bao lâu?
13. Với mode `require` (bắt buộc lời giải duy nhất): quy tắc dừng sớm có tương tác gì với finishOnce
    và việc sửa lời giải không? Có ca nào ứng viên tốt nhất bị sửa xong thì rời dải, khiến dừng sớm
    trả về kết quả kém hơn không?

E. Bộ giám sát

14. Lần chạy 145 giây cho 9/10 câu: câu thứ 10 bị cắt bởi giới hạn nào (targetMs 60000,
    dispatchStopMs 115000 hay giới hạn của test)? Một tác vụ puzzleCandidate đơn lẻ dài nhất
    mất bao lâu?

Thứ tự ưu tiên nếu agent thiếu thời gian: câu 2, 3, 8, 9 và 10 là đủ để tôi kết luận quy tắc có an toàn
không. Câu 5 và 6 cho biết mức độ ảnh hưởng tới người dùng. Câu 11 đến 13 quyết định làm ở MP07 hay MP09.

## Answers

### Summary for Fable

All numbers use `difficulty-v2` ratings and the uncommitted MP07 working tree (`gen-v3`); the early-stop rule is only
simulated offline. The answers below follow the priority groups: Q2, Q3, Q8 (Hell 3), Q9, Q10; Q5, Q6, Q7, Q8 (cells);
Q1, Q4, Q14; Q13, Q11, Q12.

- **Hell 3 on 22 x 22 has no central candidate at all (Q1-Q3).** K = 73, every one of the 480 ratings (10 puzzles x 48) is in
  band (162 <= score), saturated (`B = 5000`) and has 1-4 clues; the scores are 174 / 172 / 170 / 168 for 1 / 2 / 3 / 4 clues.
  174 (one clue) is the highest `difficulty-v2` score a 73-piece set can reach; the central half starts at 180.25. Nothing is
  above 180.25, so all 48 ratings of every puzzle are wasted for the purpose of centring; they only move the result from
  170 (3 clues, the old result) to 174 (1 clue). MP07 returns the 1-clue set (rating #37-#48) in all 10 puzzles.
- **Cost (Q4, Q5, Q14).** 48 ratings per puzzle at a median 0.50 s = 24 s per puzzle (98.7-99.9 % of the puzzle time; carving 0.33 s,
  layout walk 18-42 ms, certificates lazy). Serial run 243.2 s against 5.75 s before MP07 (42 times); the real 2-worker flow
  140.2 s with 9 of 10 puzzles and `N-PARTIAL` against 3.86 s with 10 of 10 (at least 36 times). The tenth puzzle is cut by the
  pool's per-request deadline `TIME.dispatchStopMs = 115000`, not by `targetMs` nor a test limit; the longest `puzzleCandidate`
  task is 25.0 s.
- **How widespread (Q6, Q7).** In the measured matrix (10x6 Hard/Master, 12x12 Master, 18x20 Hard/Master, 22x22 Hell 1/2/3,
  plus 32x15 Hell 3, 15x20 Hell 2, 18x18 Hell 2; 5 puzzles each) only the two Hell 3 cells use all 48 ratings (10 of 10 and 5 of 5);
  every other cell needs at most 10. Structurally (highest v2 score `2 (K - 1) + 30` for K pieces) the central half is
  unreachable for some K in five cells: 22x22 Hell 3 (K 73-76 of 8 values), 32x15 Hell 3 (5 of 9), 24x24 Hell 3 (1 of 11),
  15x20 Hell 2 (2 of 7) and 18x18 Hell 2 (1 of 7); no cell is unreachable for every K. The best score is below the central half in
  both exhausting cells; no cell has candidates on both sides without a central hit.
- **The rule on Hell 3 (Q8).** N = 4 / 8 / 12 stop at ratings 5-9 / 9-17 / 17-22 (480 ratings become 62 / 138 / 187; rating time
  242.6 s becomes 30.8 / 68.8 / 93.9 s) and return 170 or 172 instead of 174: all 10 results change, but no central
  candidate exists, so none is missed.
- **Safety of the rule on all data (Q9, Q10).** 2,106 calls with a finite band (21 files; vectors, fixtures, UI recipes, 10x6 /
  12x12 populations, the matrix cells). Misses of a central result found later by MP07: N = 4: 42 (59 firings); N = 8: 2 (17 firings);
  N = 12: 0 (15 firings, all Hell 3). Both N = 8 misses are one rating late: 15x20 Hell 2 K = 50 set calibration (rule 124 at #9,
  MP07 126 at #10) and the 10x6 Master recipe board seed `pop-master-any-22` (rule 39 at #9, MP07 48 at #10). The cause is the count
  steering (about 4 ratings per clue count, so a descent 3 -> 2 -> 1 needs 9-10 ratings): N = 8 is on the boundary, N = 12 is the smallest
  tested value with no miss, but it fires only in the two Hell 3 cells, so its margin is what these data show.
- **Pinned fixtures at N = 8 (Q9).** 0 firings and 0 changed results on the 34 finite-band calls of the vectors of
  `tests/clues.test.js`, the 17 calls of `record-fixtures --check`, the 14 calls of the generation case and the 16 calls of
  the two small UI-flow recipes. N = 4 would fire on 4 vector calls (2 misses). So `generation-case.json`, `generated-sample-pack.json`,
  `default-10x6-normal` and `heart-n10-master` would stay byte-identical; only the Hell 3 recipe changes (predicted scores
  `[172, 172, 172, 172, 172, 170, 172, 172, 172, 172]`, to be pinned by a run).
- **`require` mode (Q13).** The first raw central candidate is repaired in 48 of 180 recipe-board calls and leaves the band in 42 of
  them (371 repair ratings, 91 % out of band). A rule on the raw ratings never fires there (0 of 191 `require` calls at N = 8), but a rule that counts
  the repaired scores is not safe: at N = 8 it fires on 21 calls, returns a worse result on 14 and misses a central final
  result 13 times. A rule on final results is therefore unsafe in `require` mode, and a raw-ratings rule is inert there.
- **Cost of doing it (Q11, Q12; estimates).** About 35-55 code lines, 8-10 test cases (150-200 lines) and 15-25 doc lines. In MP07: no
  fixture re-record at N = 8, gates about 6-8 min of machine time, `generator-controller.test.js` from 142 s to about 40-50 s, the
  Hell 3 recipe would complete 10 of 10 and be pinned. In MP09: MP09c edits the same `afterProfile`, and N must be re-validated on v3
  ratings (all numbers here are `difficulty-v2` sequences); a new algorithm id would add one re-record and one `npm test`.
- **Observation.** For v2 a structural test "highest possible score `2 (K - 1) + 30` is below the lower edge of the central half"
  is exact (it cannot miss a central candidate by construction) and covers the Hell 3 K = 73-76 cases; it is v2-specific and
  needs the rating formula, so it is not a candidate for v3 without a bound derived from the v3 rating.

### Answers by question

All timings are serial (one thread) unless marked "2 workers". Scores are `difficulty-v2` ratings. The Hell 3 recipe is
`square-22x22-hell-3` (22 x 22, set seed `t18-big-a`, batch seed `t18-big-a#1`, `uniqueness: any`, 73 pieces). "Serial"
means the engine's own functions run in one thread in fold order (`setAttempt`, `foldStart`, `puzzleCandidate`,
`foldAccept`), with a read-only observer on `selectClues`; it reproduces the real flow's puzzles (checked: the serial
driver gives exactly the recipe scores `[14, 14, 14, 15, 14]` and `[43, 41, 46, 49, 47, 46, 47, 48, 45, 42]` of
`default-10x6-normal` and `heart-n10-master`, and the 10 scores of the Hard generation case). Section "Commands and
artefacts" lists every command.

#### Q2. The 48 ratings of the 3 puzzles of the quantity 3 batch (group 1)

The quantity 3 batch is the first three puzzles of the quantity 10 run (the fold consumes candidates in slot order and
`quantity` does not enter any seed), so one serial run with quantity 10 serves both. Puzzle 1 is the set's calibration
puzzle (set attempt 0, the winning attempt), puzzles 2 and 3 are the candidates of slots 2 and 3 (attempt 0 each; no
candidate was rejected in the whole run). Band Hell 3 = [162, 235), centre 198.5, central half [180.25, 216.75].
Each entry is `rating index:clues/score` (K = 73):

Puzzle 1 (set attempt 0): first rating in band: #1; first rating with the best score 174: #38 (also #44, #46, #47);
the returned rating: #44 (score 174, 1 clue; among the four 174 ratings the smaller clue key wins the tie).

```text
1:3/170 2:3/170 3:3/170 4:3/170 5:4/168 6:3/170 7:2/172 8:4/168 9:2/172 10:4/168 11:4/168 12:3/170 13:4/168 14:2/172 15:4/168 16:2/172 17:2/172 18:4/168 19:4/168 20:4/168 21:4/168 22:4/168 23:4/168 24:3/170 25:2/172 26:4/168 27:3/170 28:3/170 29:4/168 30:4/168 31:3/170 32:4/168 33:2/172 34:4/168 35:3/170 36:3/170 37:3/170 38:1/174 39:2/172 40:3/170 41:3/170 42:3/170 43:3/170 44:1/174 45:3/170 46:1/174 47:1/174 48:2/172
```

Puzzle 2 (slot 2, attempt 0): first in band #1; first 174 at #38 (also #45, #47); returned #38 (score 174).

```text
1:3/170 2:3/170 3:3/170 4:3/170 5:4/168 6:2/172 7:3/170 8:3/170 9:2/172 10:3/170 11:4/168 12:2/172 13:4/168 14:2/172 15:4/168 16:4/168 17:4/168 18:4/168 19:2/172 20:2/172 21:2/172 22:4/168 23:2/172 24:3/170 25:4/168 26:4/168 27:4/168 28:4/168 29:2/172 30:3/170 31:4/168 32:2/172 33:2/172 34:4/168 35:4/168 36:4/168 37:3/170 38:1/174 39:3/170 40:3/170 41:2/172 42:3/170 43:2/172 44:3/170 45:1/174 46:3/170 47:1/174 48:3/170
```

Puzzle 3 (slot 3, attempt 0): first in band #1; first 174 at #37 (also #44); returned #44 (score 174).

```text
1:3/170 2:3/170 3:3/170 4:3/170 5:2/172 6:3/170 7:4/168 8:4/168 9:2/172 10:4/168 11:4/168 12:2/172 13:4/168 14:2/172 15:3/170 16:4/168 17:4/168 18:3/170 19:4/168 20:3/170 21:2/172 22:4/168 23:4/168 24:4/168 25:3/170 26:2/172 27:3/170 28:4/168 29:3/170 30:3/170 31:3/170 32:4/168 33:3/170 34:4/168 35:2/172 36:4/168 37:1/174 38:2/172 39:3/170 40:3/170 41:3/170 42:2/172 43:3/170 44:1/174 45:2/172 46:3/170 47:2/172 48:2/172
```

Over all 10 puzzles of the quantity 10 run the returned rating is at #37-#48 (#44, #38, #44, #47, #45, #43, #37, #48, #37,
#40). Every call used exactly 48 ratings (stop at profile 48; none stopped early).

#### Q3. Is any of the 48 ratings above 216.75 or above the band? (group 1)

No. In all 10 puzzles (480 ratings) the scores lie in [168, 174]: 0 ratings above the central half (216.75), 0 above
the band (235), 0 inside the central half, 480 of 480 below its lower edge 180.25. All 480 are in band (162 <= score).
The highest score seen is 174 (1 clue). Per puzzle: `<central 48, >central 0` (analysis output).

#### Q8. Early-stop rule N = 4, 8, 12 on the puzzles of Q2 and Q6 (group 1: the Hell 3 puzzles)

Rule as simulated (offline, from the recorded sequences; `simulate.mjs`): stop at the first rating at which (1) at least
one rated candidate is in band, (2) all rated candidates, in band or not, lie on one side of the central half, and
(3) the last N ratings gave no in-band candidate strictly nearer to the centre than the best so far; return the best
in-band candidate in `ranked()` order (distance to the centre, then clue key). Central half = `|score - centre| <=
(max - min) / 4`, as in `clues.js`.

Hell 3, all 10 puzzles (the first 3 are the Q2 puzzles); each cell is `stop rating, returned score`; MP07 returned
score 174 after 48 ratings in every row, and the rule's clue set differs from MP07's in every cell:

| puzzle | MP07 (ratings, score, rating #) | N = 4 | N = 8 | N = 12 |
|---|---|---|---|---|
| 1 | 48, 174, #44 | 5, 170 | 15, 172 | 19, 172 |
| 2 | 48, 174, #38 | 5, 170 | 14, 172 | 18, 172 |
| 3 | 48, 174, #44 | 9, 172 | 13, 172 | 17, 172 |
| 4 | 48, 174, #47 | 5, 170 | 15, 172 | 19, 172 |
| 5 | 48, 174, #45 | 9, 172 | 13, 172 | 17, 172 |
| 6 | 48, 174, #43 | 5, 170 | 9, 170 | 22, 172 |
| 7 | 48, 174, #37 | 5, 170 | 15, 172 | 19, 172 |
| 8 | 48, 174, #48 | 5, 170 | 14, 172 | 18, 172 |
| 9 | 48, 174, #37 | 9, 172 | 13, 172 | 17, 172 |
| 10 | 48, 174, #40 | 5, 170 | 17, 172 | 21, 172 |

Totals for the 10 Hell 3 puzzles: ratings 480 (MP07) vs 62 (N = 4), 138 (N = 8), 187 (N = 12); recorded rating time
242.6 s vs 30.8 s, 68.8 s, 93.9 s (7.9x, 3.5x, 2.6x less). Every result changes (10 of 10 at every N): the rule returns
170 or 172 where MP07 returns 174, because the improving 1-clue sets (174) only appear at ratings #37-#48 while the beam
descends from 3 to 1 clues. None of these puzzles has a central candidate, so no central candidate is missed. The other
cells of Q6 are filled in under Q6/Q8 (group 2).

#### Q9. Reference vectors and fixtures, N = 8 (group 1)

The vectors of `tests/clues.test.js` were replayed with the same seeds, targets, boards and scripted ratings
(`vectors.mjs`: 36 `selectClues` calls, 34 with a finite band), plus the calls made by `record-fixtures --check` (the
generation case replay and the 3 sample puzzles: 17 calls), the generation-case batch run serially (14 calls), and the two
UI-flow recipes `default-10x6-normal` (6 calls) and `heart-n10-master` (10 calls).

| set | calls (finite band) | rule fires at N = 8 (earlier than MP07) | results changed | N = 4: fires / changed / missed central |
|---|---|---|---|---|
| vectors of `tests/clues.test.js` | 34 | 0 | 0 | 4 / 4 / 2 |
| `record-fixtures --check` (generation case + sample pack) | 17 | 0 | 0 | 0 / 0 / 0 |
| generation-case batch (10 puzzles, serial) | 14 | 0 | 0 | 0 / 0 / 0 |
| `default-10x6-normal` | 6 | 0 | 0 | 0 / 0 / 0 |
| `heart-n10-master` | 10 | 0 | 0 | 0 / 0 / 0 |

So with N = 8 the rule never fires on any vector or fixture MP07 matched: 0 activations, 0 changed results (no clue set
or score changes in `generation-case.json`, `generated-sample-pack.json` or the two small UI-flow recipes). It does change
the Hell 3 recipe (Q8: 10 of 10 puzzles). With N = 4 it fires on 4 vector calls, all `require` calls on the scripted
ratings: `req-0` and `req-2` (stops at rating 5 with 21 although the central 25 comes at rating 6 and 8: missed),
`req-3` and `req-3-excluded` (stops at 5 with 21, the same score MP07 returns after 48).

#### Q10. Does the rule stop early and miss a central candidate that MP07 finds later? (group 1)

Yes. N = 4 misses 42 times, N = 8 twice, N = 12 never in the data (2,106 `selectClues` calls with a finite band, all made
with MP07's code and the real `difficulty-v2` rating except the scripted vectors). The data: the Hell 3 and matrix-cell flows
of Q6, the vectors, fixtures and UI-flow recipes of Q9, and an extra population experiment (`pop.mjs`): 1,380 calls on the
12 classic pentominoes on 10 x 6 (6 levels x 200 seeds `any` + 30 seeds `require` per level), 220 + 220 on generated 10 x 6
Hard and Master sets (20 sets x 10 seeds, with the set calibration calls), 70 + 70 on generated 12 x 12 Master and Expert
sets (10 sets x 6 seeds). Of the 2,106 calls, 31 used 48 ratings or more (15 Hell 3 calls, 9 vector calls, 7 `require`
calls of the recipe board).

| N | rule fires earlier than MP07 | results changed | misses (rule stops, MP07 finds a central result later) | where the misses are |
|---|---|---|---|---|
| 4 | 59 | 59 | 42 | recipe board 21 (Normal 4, Expert 4, Master 13), 10x6 Master 13, 10x6 Hard 1, 12x12 Master 1, 12x12 Expert 1, cell 15x20 Hell 2 3, vectors 2 |
| 8 | 17 | 17 | 2 | recipe board Master `any` seed `pop-master-any-22` (1); cell 15x20 Hell 2, set calibration (1) |
| 12 | 15 | 15 | 0 | (the 15 firings are the 10 Hell 3 puzzles and the 5 puzzles of cell 32x15 Hell 3, none of them has a central candidate) |

The two N = 8 misses are both "one rating late":

1. Cell 15x20 Hell 2 (K = 50, `uniqueness: any`, set seed `t18-big-a`, set attempt 0 = the calibration puzzle). Hell 2 =
   [112, 162), centre 137, central half [124.5, 149.5]. MP07's sequence is `1:3/124 2:3/124 3:3/124 4:3/124 5:3/124
   6:3/124 7:4/122 8:4/122 9:4/122 10:2/126`: 124 is in band but 0.5 below the central half, the central 2-clue set
   (126) is found at #10. The rule with N = 8 stops at #9 and returns 124; MP07 returns 126.
2. The 12 classic pentominoes on 10 x 6, Master [37, 53) (centre 45, central half [41, 49]), rng seed `pop-master-any-22`:
   `1:3/39 2:3/35 3:3/33 4:3/37 5:2/36 6:2/29 7:2/29 8:2/38 9:1/35 10:1/48` (`rating index:clues/score`). The first
   in-band rating is #1 (39); the rule with N = 8 fires at #9 (all candidates below the central half) and returns 39;
   MP07 finds 48 (central) at #10.

The reason is the count steering: it takes four samples per clue count (or beam moves), so a descent 3 -> 2 -> 1 clues needs
9-10 ratings before the central count is rated; N = 8 sits exactly on that boundary. At N = 4 the rule stops at rating 5
(the first four ratings at the initial count are non-improving) while MP07 finds the central candidate at rating 6-26. No
other cell of Q6 (10x6, 12x12, 18x20, 22x22 Hell 1 and Hell 2, 18x18 Hell 2) and no fixture ever reaches a stall of 8.

#### Q5. The same request on the code before MP07 (group 2)

Commit `60575a4` exported read-only (`git archive`), the same serial driver and the same real two-worker flow, both pointing at
the exported tree through `D21_ROOT`. Hell 3, 22 x 22, seed `t18-big-a`, quantity 10, `uniqueness: any`.

| | before MP07 (stops at the first in-band candidate, `gen-v2`) | MP07 (centre search, `gen-v3`) | ratio |
|---|---|---|---|
| ratings per puzzle | 1 for each of the 10 puzzles (10 `selectClues` calls, 10 ratings) | 48 for each of the 10 puzzles (480 ratings) | 48x |
| scores of the 10 puzzles | `[170, 170, 170, 170, 170, 170, 170, 170, 170, 170]` (3 clues each) | `[174, 174, 174, 174, 174, 174, 174, 174, 174, 174]` (1 clue each) | |
| serial total | 5.75 s (set 0.77 s + batch 4.97 s) | 243.2 s (set 25.3 s + batch 217.8 s) | 42x |
| median rating | 0.50 s | 0.50 s | |
| real flow, 2 workers (set request + batch request) | 3.86 s in all: set 0.88 s, batch 2.97 s, 10 of 10 puzzles, no notice | 140.2 s: set 25.0 s, batch cut at 115.0 s, 9 of 10 puzzles, `N-PARTIAL` | at least 36x |

Without the deadline the MP07 flow would need about 147 s (25 s + 5 rounds of about 24.5 s for 9 candidates on 2 workers;
estimate from the task times), about 38 times the old 3.86 s. All other tested cells (Q6) run at most 10 ratings per
puzzle and are not slower than before by more than a few ratings: the extra cost is concentrated in cells whose central half
is out of reach.

#### Q6. Which cells use all 48 ratings without a candidate in the central half? (group 2)

No earlier data of this kind exists (the landscape and GV2 records were made before MP07 and do not count ratings per
call), so the minimum run of the question was made, plus three extra landscape cells: 5 puzzles each, 1 seed, serial,
`any` mode. Seeds: set seed `t18-rect-a` for the 10 x 6 cells and `t18-big-a` for the others (batch seed `<set seed>#1`).
Hell 3 22 x 22 are the first 5 accepted puzzles of the quantity 10 run of Q2 (the same seed). `exhausted` = the call used at
least 48 ratings and its result is not in the central half.

| cell (board, level) | K | puzzles | puzzles that exhausted 48 ratings | median ratings per puzzle | median rating time | serial time per puzzle (average of 5; puzzle 1 includes the set) |
|---|---|---|---|---|---|---|
| 10x6 Hard | 9 | 5 | 0 | 1 | 0.9 ms | 13 ms |
| 10x6 Master | 12 | 5 | 0 | 5 | 3.3 ms | 117 ms |
| 12x12 Master | 16 | 5 | 0 | 3 | 5.4 ms | 51 ms |
| 18x20 Hard | 16 | 5 | 0 | 1 | 4.9 ms | 61 ms |
| 18x20 Master | 20 | 5 | 0 | 1 | 20.3 ms | 67 ms |
| 22x22 Hell 1 | 39 | 5 | 0 | 1 | 2.07 s | 2.06 s |
| 22x22 Hell 2 | 54 | 5 | 0 | 1 | 1.41 s | 1.35 s |
| **22x22 Hell 3** | 73 | 5 | **5** | **48** | 0.51 s | **24.6 s** |
| extra: 32x15 Hell 3 | 73 | 5 | **5** | **48** | 0.47 s | **24.7 s** |
| extra: 15x20 Hell 2 | 50 | 5 | 0 | 6 | 0.24 s | 2.2 s |
| extra: 18x18 Hell 2 | 51 | 5 | 0 | 1 | 0.41 s | 1.1 s |

Only the two Hell 3 cells exhaust (10 of 10 puzzles in the 22 x 22 quantity 10 run, 5 of 5 in 32 x 15). In every other
cell no call came near 48 ratings (the largest is 10 ratings, in 15 x 20 Hell 2). The scores are 19-22 (10x6 Hard), 41-42 (10x6
Master), 41-43 (12x12), 20 (18x20 Hard), 42-47 (18x20 Master), 100 (Hell 1), 132 (Hell 2 22x22), 126 (the two other Hell 2),
174 (Hell 3).

Structural reach of the whole landscape matrix (105 cases on 16 boards, `landscape-reach.mjs`): the highest possible
`difficulty-v2` score for K pieces is 2 (K - 1) + 30 (one clue, B saturated). The central half is out of reach for K values of
five cells, and for no cell at every K:

| cell | K range | central half | highest score at max K / min K | K values that cannot reach it |
|---|---|---|---|---|
| 22x22 Hell 3 (484 cells) | 73-80 | [180.25, 216.75] | 188 / 174 | 4 of 8 (K 73-76) |
| 32x15 Hell 3 (480 cells) | 72-80 | [180.25, 216.75] | 188 / 172 | 5 of 9 (K 72-76) |
| 24x24 Hell 3 (576 cells) | 76-86 | [180.25, 216.75] | 200 / 180 | 1 of 11 (K 76) |
| 15x20 Hell 2 (300 cells) | 47-53 | [124.5, 149.5] | 134 / 122 | 2 of 7 (K 47, 48) |
| 18x18 Hell 2 (324 cells) | 48-54 | [124.5, 149.5] | 136 / 124 | 1 of 7 (K 48) |

All other 100 cases reach the central half at every K. For the reachable K close to the limit (for example K = 77 in Hell 3,
where only a 1-clue set at 182 is central, or K = 50 in 15 x 20 Hell 2, where 2 clues give 126 = 1.5 above the lower edge
124.5), the search needs many ratings (5-10 in the 15 x 20 Hell 2 data above) but did not exhaust in the data; those cells
with K at the limit were not measured beyond 15 x 20 Hell 2 (K 50) and 18 x 18 Hell 2 (K 51).

#### Q7. For the exhausting cells: is the best score below or above the central half? (group 2)

Below, in both cells. 22 x 22 Hell 3: all 480 ratings of the 10 puzzles lie in [168, 174], best 174 < 180.25; none above
(Q3). 32 x 15 Hell 3: all 240 ratings are in [168, 174] and the best of every puzzle is 174. In both cells every rating is in
band, none is below the band and none above the central half, so no matrix cell has candidates on both sides of the central half.
Cases with candidates on both sides but no central hit exist only among the vectors of `tests/clues.test.js` (`reserve-0`: 36
ratings below the central half and 12 above; `reserve-3`: 35 / 13; `tie-0` with scripted ratings: 28 / 20; `repair-seed3-require`:
31 / 15 with 2 central; `simulate.mjs --sides`).

#### Q8 (continued). The Q6 cells (group 2)

For the cells that never exceed 10 ratings the rule cannot fire before MP07 stops (it needs at least 4 non-improving ratings
after the first in-band one, and a central stop comes first): 0 firings at N = 4, 8, 12 in 10x6 Hard, 10x6 Master, 12x12
Master, 18x20 Hard and Master, 22x22 Hell 1 and Hell 2, 18x18 Hell 2. Exceptions: 15 x 20 Hell 2 (N = 4 fires 3 times at
rating 5, returning 124 where MP07 returns 126 at rating 6-10; N = 8 fires once, set calibration puzzle, rating 9 vs MP07's
rating 10: a miss, see Q10; N = 12 never) and 32 x 15 Hell 3 (all 5 puzzles at every N, no central candidate, no miss): N = 4
stops at rating 5 or 9 with 170 or 172; N = 8 stops at 13-15 with 172; N = 12 stops at 17-19 with 172; MP07 returns 174
after 48 ratings in all five. Ratings saved over the 5 puzzles: 207 (N = 4), 170 (N = 8), 150 (N = 12) of 240.

#### Q1. Where does the score 174 come from? (group 4)

K = 73 pieces. Across all 10 puzzles (480 ratings, `--combos` of `analyse.mjs`) every rating is saturated: `B = 5000`,
`branchTrials = 5000` (the cap), `saturated: true`, 480 of 480. The score is `round(2 U + 8 log10(1 + 5000)) = round(2 U +
29.6)`, so it depends on the number of clues only:

| clues | U = 73 - clues | score | ratings (of 480) |
|---|---|---|---|
| 1 | 72 | 174 | 30 |
| 2 | 71 | 172 | 108 |
| 3 | 70 | 170 | 193 |
| 4 | 69 | 168 | 149 |

So: yes, every candidate in the band is B-saturated; no, the clue count is not at the minimum for every candidate (1 to 4
clues were rated), but the returned result of every puzzle is the minimum: 1 clue, U = 72, score 174 (the clue count cannot
go below 1). 174 is the highest `difficulty-v2` score a 73-piece set can have, 6.25 below the lower edge 180.25 of the central
half; central candidates would need `2 U + 30 >= 180.25`, that is U >= 76 > 72. The old code accepted the first rating, the
initial 3 clues (U = 70, score 170).

#### Q4. Time per puzzle, per rating, and outside the ratings (group 2; serial run of Q2, quantity 10)

| | time |
|---|---|
| total per puzzle (ratings + everything else) | puzzle 1 (the whole set request): 25.3 s; puzzles 2-10 (all candidates attempt 0): 24.2, 24.4, 24.6, 24.3, 25.2, 24.0, 23.1, 23.6, 24.4 s |
| one rating (480 ratings) | median 0.499 s, 95th percentile 0.633 s, maximum 1.260 s, minimum 0.326 s |
| sum of the ratings per puzzle | 23.1-25.2 s (median 24.3 s); the 48 ratings of a puzzle are 98.7-99.9 % of its time |
| outside the ratings: carving (set request) | 0.33 s (set request 25.31 s, ratings in it 24.98 s) |
| outside the ratings: layout walk (LNS) of a candidate | 18-42 ms per candidate (9 candidates) |
| outside the ratings: uniqueness check | none during generation in `any` mode (certificates are lazy and excluded from the batch time); measured separately on the 3 puzzles of the quantity 3 run: `certify` 267, 234 and 174 ms, status `not-proved` (row limit 2,000) |

In the real two-worker flow the same tasks take: `puzzleCandidate` 22.8-25.0 s (8 completed tasks, median 24.1 s),
`setAttempt` attempt 0 24.98 s (the winning attempt) and attempt 1 8.75 s (lower attempts win only when they finish; the
pool waited for attempt 0).

#### Q14. What cut the tenth puzzle of the 145 s run? (group 4)

The pool's per-request deadline `TIME.dispatchStopMs = 115000` (`core/engine/policy.js`, used by `core/browser/worker-pool.js`
in `beginRequest`): not `targetMs` (60,000: only a bench report threshold, not used by the pool) and not a test limit
(`tests/generator-controller.test.js` sets no timeout). Every generation request (the set request and the batch request) gets
its own 115 s timer. Instrumented real flow (2 workers, the same recipe; `flow-pool.mjs`, timestamps in ms from the start):

| event | time |
|---|---|
| set request begins / ends | 5 ms / 25,006 ms (set attempt 0 wins after 24.98 s) |
| batch request begins | 25,018 ms |
| slots 2+3 finish | 48,619 / 49,118 ms (23.6 and 24.1 s tasks) |
| slots 5+4 finish | 72,639 / 73,626 ms |
| slots 6+7 finish | 97,177 / 98,042 ms |
| slots 8+9 finish (puzzles 8 and 9; with the calibration these are 9 puzzles) | 120,020 / 122,226 ms |
| slot 10 attempt 0 starts (when slot 8's worker was free) | about 120,020 ms (20.0 s before the deadline) |
| `request-timeout`, elapsed 115,002 ms; slot 10 and the speculative slot 9 attempt 1 are aborted (`deadline`) | 140,021 ms |
| flow ends with notice `N-PARTIAL`, 9 puzzles | 140,171 ms (the node:test run reports 140-145 s with start-up) |

Slot 10 needed about 24 s but had 20 s left; four rounds of two candidates take 97 s, the fifth round starts at 95 s into the
batch and would end at about 119 s, 4 s after the 115 s deadline. The longest single `puzzleCandidate` task that completed
took 25.0 s (slot 4); the longest `setAttempt` 24.98 s. With three workers the 9 batch candidates would take 3 rounds
(about 74 s) and fit.

#### Q13. The rule in `require` mode: interaction with `finishOnce` and the repair (group 3)

Mechanics. In MP07 `afterProfile` calls `finishOnce` right after the rating of every central raw candidate: `makeUnique`
adds clues until the raw completion is unique, the set is rated again (a repair rating, not a profile; it never goes through
`onRate`), and the final result counts as central only if the repaired score is in the central half. So in `require` mode the
quantity the search aims at is the final score, while the early-stop rule of the question is defined on the rated candidates.
Two consequences: (1) a rule on the raw ratings never fires when a raw central candidate exists, even if its repair left the
central half or the band (condition "all candidates on one side" is false); (2) a rule that looks at final results has to
include the repair outcomes, and at the stop it must still run `chooseBest`, which repairs further candidates (more repair
ratings plus `makeUnique` work that the early stop does not save).

Measurement. MP07 code, real `difficulty-v2` rating, the 12 classic pentominoes on 10 x 6, `require`, 30 seeds per level x 6
levels = 180 calls (plus the 11 finite-band `require` calls of the vectors); the preload also records every repair
rating (a rating through the `rate` seam that is not followed by `onRate`):

| `pop-recipe-board.jsonl`, 180 `require` calls | count |
|---|---|
| repair ratings | 371 (2.06 per call): 339 out of the band (91 %), 26 in band but outside the central half, 6 central |
| first raw central candidate of a call | already unique (no repair): 132; repaired: 48 |
| ... of the 48 repaired | left the band: 42; stayed in band, off-centre: 5; central: 1 |
| calls that went on rating after the first raw central candidate | 49 (27 %), 852 further ratings |
| results that are not central although a raw central candidate existed | 7 (all Master; results 38-40, central half [41, 49]; 48-50 ratings each) |

So yes: the best (raw central) candidate often leaves the band after its repair (42 of 48 repaired first candidates), and then
the early return of a rule that trusts the raw ratings, or of one that stops on the first side-pure stall, could return a worse
result than MP07's.

Simulation of the rule with the final results of finished candidates (`simulate-require.mjs`: the repaired score replaces the
raw score of a candidate whose finish ran right after its rating; the other conditions as in Q8; 191 `require` calls):

| N | fires earlier than MP07 | returned score differs | worse (further from the centre) | misses a central final result | ratings saved |
|---|---|---|---|---|---|
| 4 | 27 | 23 | 20 | 18 | 599 |
| 8 | 21 | 17 | 14 | 13 | 427 |
| 12 | 18 | 14 | 11 | 10 | 328 |

So a final-aware rule is not safe in `require` mode in this model: at N = 8 it stops early on 21 of 191 calls and misses a
central final result 13 times (the repairs lower the effective scores, so the descent looks stalled on one side while the
count steering is still on its way to a central count). The raw rule is "safe" in `require` mode only because it does not
fire: with N = 8 it fires on 0 of the 191 `require` calls (all 17 of its N = 8 firings in the whole data are `any` calls).
Limits of this simulation: repairs after profile 48 are not attributed to a candidate; the model is mine (the question's rule
does not say whether raw or final scores count), the data are 180 real calls on one board plus 11 vectors.

#### Q11. If the rule goes into MP09 instead (group 3; estimate)

Estimates from the size of MP07's own diff (`core/engine/clues.js` +130/-34 lines for the whole acceptance; 10 new test
cases +257 lines in `tests/clues.test.js`; §6.10 of the design +66 lines for the whole document change).

- Code: about 35-55 lines in `clues.js` (a constant `STALL_LIMIT`, per-call state: best distance, stall counter, the three side
  flags, the unfinished/finished attribution for `require`, and a branch in `afterProfile` that calls `chooseBest`), plus about
  15-25 lines of design text in §6.10 and §13.2.
- Tests: 8-10 new cases in `tests/clues.test.js` (about 150-200 lines): fires after N non-improving ratings on one side;
  does not fire with a central candidate seen; does not fire with candidates on both sides; boundary N - 1 / N; returns the
  best by `ranked()`; `require` with repairs (final-aware); unbounded band never fires; `rate` seam trace; plus the real
  Hell 3 recipe (ratings count and score with v2 until MP09d2). Existing vectors stay valid at N = 8 (0 of 34 change).
- Fixtures: no pinned fixture changes at N = 8 (`generation-case.json`, `generated-sample-pack.json`, `default-10x6-normal`,
  `heart-n10-master`: 0 changed results, Q9), so no extra GF run; only the Hell 3 UI-flow recipe changes (predicted scores
  `[172, 172, 172, 172, 172, 170, 172, 172, 172, 172]` from Q8, to be pinned by the run) which D21 re-pins anyway, and which
  MP09d2/MP12b re-pin again. If the owner treats the rule as a change of the algorithm identity (a new id `gen-v4` instead of
  keeping `gen-v3`) then one more fixture re-record (`record-fixtures --replace`, 0.3 s) and one `npm test` (about 2.5 min)
  are needed. MP09d2's GF-P2 re-records everything under v3 in any case.
- Where it lands: MP09c edits `afterProfile` and `finish` for unrateable and unproved candidates (RES-04, RES-35), so the rule
  would be a second change to the same function; under the v3 rating the score sequences change (they are measured here with
  `difficulty-v2`), so N must be validated again on v3 data (this document's scripts run in about 20 s for the cheap boards and
  about 5 min for the Hell 3 flows). Until then the Hell 3 recipe keeps failing or is changed by D21.

#### Q12. If it is done now in MP07 (group 3; estimate)

- Implementation and tests as in Q11 (about the same lines; MP07's files only: `clues.js`, `tests/clues.test.js`, §6.10).
- To re-run: `node --test tests\clues.test.js` (2.6 s) with the new cases; the 36 existing vectors are unchanged at N = 8;
  `record-fixtures --check` (0.3 s; the fixtures stay byte-identical, Q9); `npm run test:quick` (18 s) and `npm run check`
  (2 s); GA-P1 `npm test`: two full runs measured 151.6 s each, dominated by the Hell 3 flow of `generator-controller.test.js`
  (140-145 s). With the rule that test shrinks about 3.5 times (N = 8: 138 ratings instead of 480, rating time 68.8 s instead of
  242.6 s serial, so about 35-45 s in the 2-worker flow instead of 140 s; N = 4: 62 ratings, 30.8 s); the `npm test` run
  would be correspondingly shorter (not measured), and `node --test tests\generator-controller.test.js` (142 s now) about
  40-50 s. The recipe then needs its Hell 3 `expect.scores` pinned from the run (D21 option (a) would not be needed).
- GF-P1 would not change the fixtures at N = 8 (`--replace` writes identical files; the reason text stays), GA-P1 needs the one
  run above, plus the re-run of `generator-controller.test.js` after pinning the recipe: about 6-8 min of machine time in all.
- Developer time: about 30-45 min including the documents (one more review round for the rule's `require` semantics, Q13).

### Commands and artefacts

All commands run in the repository root (PowerShell). `$d` is the artefact folder; `register.mjs` is a preload
(`node --import`) that wraps `selectClues` of the tree under test, writes one JSON line per call (the rating sequence recorded
through `onRate`, plus every repair rating recorded through the `rate` seam) and per driver event to the file in `D21_OUT`
(appended: delete the file before re-running). `D21_ROOT` selects the tree (default: the working directory, the MP07 tree).
`flow.mjs` is a serial driver built from the engine's own functions (`setAttempt` for j = 0..31, `foldStart`,
`puzzleCandidate`, `foldAccept`); `flow-pool.mjs` runs the real two-worker flow (pool, client, controller). The product code
is not modified: the observer rewrites the module text in memory at load time only. A board `WxH` is columns x rows.

```powershell
$d = 'docs/difficulty-v3/d21-2026-11-12'
function Run($out, $script, $argList) { $env:D21_OUT = "$d/$out.jsonl"; node --import "./$d/register.mjs" "./$d/$script" @argList }
```

Pre-MP07 tree (read-only git; nothing is checked out; `node_modules` is not needed):

```powershell
git archive 60575a4 -o "$env:TEMP\pento-60575a4.zip"
Expand-Archive "$env:TEMP\pento-60575a4.zip" "$env:TEMP\pento-60575a4"
```

Timed runs (the numbers in Q4, Q5, Q6 and Q14; the files `hell3-*` and the cells with Hell 3):

```powershell
# Q2, Q3, Q4, Q5(MP07), Q1, Q7, Q8: serial, quantity 10 (the first 3 puzzles are the quantity 3 batch)
Run 'hell3-q10-mp07' 'flow.mjs' '--recipe','square-22x22-hell-3','--quantity','10','--label','hell3-q10-mp07'     # 243 s
# Q14, Q5(MP07): the real two-worker flow with timestamps
$env:D21_OUT = "$d/hell3-pool-mp07.jsonl"; node "./$d/flow-pool.mjs" --recipe square-22x22-hell-3 --quantity 10   # 142 s
# Q5: the same two runs on the pre-MP07 tree
$env:D21_ROOT = "$env:TEMP\pento-60575a4"
Run 'hell3-q10-pre' 'flow.mjs' '--recipe','square-22x22-hell-3','--quantity','10','--label','hell3-q10-pre'      # 6 s
$env:D21_OUT = "$d/hell3-pool-pre.jsonl"; node "./$d/flow-pool.mjs" --recipe square-22x22-hell-3 --quantity 10   # 4 s
Remove-Item Env:D21_ROOT
# Q4: certificates of the 3 puzzles (lazy, outside the batch time)
Run 'hell3-q3-certify' 'flow.mjs' '--recipe','square-22x22-hell-3','--quantity','3','--certify','1','--label','hell3-q3-mp07'   # 73 s
# Q6: the matrix cells, 5 puzzles each, serial, `any`
Run 'cell-10x6-hard' 'flow.mjs' '--board','10x6','--level','hard','--seed','t18-rect-a','--quantity','5','--label','cell-10x6-hard'
Run 'cell-10x6-master' 'flow.mjs' '--board','10x6','--level','master','--seed','t18-rect-a','--quantity','5','--label','cell-10x6-master'
Run 'cell-12x12-master' 'flow.mjs' '--board','12x12','--level','master','--seed','t18-big-a','--quantity','5','--label','cell-12x12-master'
Run 'cell-18x20-hard' 'flow.mjs' '--board','18x20','--level','hard','--seed','t18-big-a','--quantity','5','--label','cell-18x20-hard'
Run 'cell-18x20-master' 'flow.mjs' '--board','18x20','--level','master','--seed','t18-big-a','--quantity','5','--label','cell-18x20-master'
Run 'cell-22x22-hell-1' 'flow.mjs' '--board','22x22','--level','hell-1','--seed','t18-big-a','--quantity','5','--label','cell-22x22-hell-1'
Run 'cell-22x22-hell-2' 'flow.mjs' '--board','22x22','--level','hell-2','--seed','t18-big-a','--quantity','5','--label','cell-22x22-hell-2'
Run 'cell-32x15-hell-3' 'flow.mjs' '--board','32x15','--level','hell-3','--seed','t18-big-a','--quantity','5','--label','cell-32x15-hell-3'   # 125 s
Run 'cell-15x20-hell-2' 'flow.mjs' '--board','15x20','--level','hell-2','--seed','t18-big-a','--quantity','5','--label','cell-15x20-hell-2'
Run 'cell-18x18-hell-2' 'flow.mjs' '--board','18x18','--level','hell-2','--seed','t18-big-a','--quantity','5','--label','cell-18x18-hell-2'
```

Timing blocks (lock protocol: `$env:TEMP\dv3-sudoku.lock` did not exist at any block start, so no waiting; the lock
`$env:TEMP\dv3-timing.lock` was created at the start and deleted at the end of each block): block A 17:29-17:36 (the four Hell 3
runs: 243 s, 142 s, 6 s, 4 s), block B 17:38-17:39 (the cells up to 22x22 Hell 2), block C 17:41-17:44 (certificates 73 s,
32x15 Hell 3 125 s, 15x20 and 18x18 Hell 2 11 s and 6 s). No other process of this checkout ran at the same time.

Score-only runs (no times reported from them):

```powershell
# Q9: the vectors of tests/clues.test.js (same seeds, boards and scripted ratings), the fixture replay, the generation case, the UI recipes
Run 'vectors' 'vectors.mjs' @()
$env:D21_OUT = "$d/fixtures-check.jsonl"; node --import "./$d/register.mjs" tools/record-fixtures.mjs --check
Run 'generation-case' 'flow.mjs' '--board','10x6','--level','hard','--seed','fixture-set-0','--quantity','10','--label','generation-case'
Run 'ui-default-10x6-normal' 'flow.mjs' '--recipe','default-10x6-normal','--label','default-10x6-normal'
Run 'ui-heart-n10-master' 'flow.mjs' '--recipe','heart-n10-master','--label','heart-n10-master'
# Q10, Q13: populations (200 seeds per level `any` and 30 `require` on the 12 classic pentominoes on 10 x 6; generated sets)
Run 'pop-recipe-board' 'pop.mjs' '--recipe-board','200'
Run 'pop-10x6-hard' 'pop.mjs' '--cell','10x6:hard','--sets','20','--seeds','10'
Run 'pop-10x6-master' 'pop.mjs' '--cell','10x6:master','--sets','20','--seeds','10'
Run 'pop-12x12-master' 'pop.mjs' '--cell','12x12:master','--sets','10','--seeds','6'
Run 'pop-12x12-expert' 'pop.mjs' '--cell','12x12:expert','--sets','10','--seeds','6'
```

Analysis (reads the `.jsonl` files only; the early-stop rule is simulated here):

```powershell
node "./$d/analyse.mjs" "$d/hell3-q10-mp07.jsonl" --sequences --puzzles 3      # Q2, Q3: the sequences, first in band, best rating
node "./$d/analyse.mjs" "$d/hell3-q10-mp07.jsonl" --combos                      # Q1: clues / B / saturated per rating
node "./$d/analyse.mjs" "$d/hell3-q10-mp07.jsonl" --row                         # Q4: times
node "./$d/simulate.mjs" "$d/hell3-q10-mp07.jsonl" --puzzles                    # Q8: stop rating and score per puzzle, N = 4, 8, 12
node "./$d/simulate.mjs" "$d/vectors.jsonl" "$d/fixtures-check.jsonl" "$d/generation-case.jsonl" "$d/ui-default-10x6-normal.jsonl" "$d/ui-heart-n10-master.jsonl" --ns 8 --list   # Q9
node "./$d/simulate.mjs" "$d/hell3-q10-mp07.jsonl" "$d/cell-10x6-hard.jsonl" "$d/cell-10x6-master.jsonl" "$d/cell-12x12-master.jsonl" "$d/cell-18x20-hard.jsonl" "$d/cell-18x20-master.jsonl" "$d/cell-22x22-hell-1.jsonl" "$d/cell-22x22-hell-2.jsonl" "$d/cell-32x15-hell-3.jsonl" "$d/cell-15x20-hell-2.jsonl" "$d/cell-18x18-hell-2.jsonl" "$d/fixtures-check.jsonl" "$d/generation-case.jsonl" "$d/ui-default-10x6-normal.jsonl" "$d/ui-heart-n10-master.jsonl" "$d/vectors.jsonl" "$d/pop-recipe-board.jsonl" "$d/pop-10x6-hard.jsonl" "$d/pop-10x6-master.jsonl" "$d/pop-12x12-master.jsonl" "$d/pop-12x12-expert.jsonl" --list   # Q10: TOTAL over 21 files, misses listed
node "./$d/simulate.mjs" "$d/vectors.jsonl" --sides                             # Q7: ratings on each side of the central half
node "./$d/simulate-require.mjs" "$d/pop-recipe-board.jsonl" "$d/vectors.jsonl" # Q13: final-aware rule on the 191 `require` calls
node "./$d/landscape-reach.mjs"                                                 # Q6: structural reach of the landscape matrix
```

Artefacts in `docs/difficulty-v3/d21-2026-11-12/`: the scripts `register.mjs`, `flow.mjs`, `flow-pool.mjs`, `vectors.mjs`,
`pop.mjs`, `analyse.mjs`, `simulate.mjs`, `simulate-require.mjs`, `landscape-reach.mjs`, and the raw results `hell3-q10-mp07`,
`hell3-pool-mp07`, `hell3-q10-pre`, `hell3-pool-pre`, `hell3-q3-certify`, `cell-*` (10 cells), `vectors`, `fixtures-check`,
`generation-case`, `ui-default-10x6-normal`, `ui-heart-n10-master`, `pop-recipe-board`, `pop-10x6-hard`, `pop-10x6-master`,
`pop-12x12-master`, `pop-12x12-expert` (`.jsonl`). Numbers quoted for the gates (`npm test` 151.6 s twice, `node --test
tests\generator-controller.test.js` 142 s, `npm run test:quick` 18 s, `record-fixtures` 0.33 s) come from the MP07 acceptance
runs, not from this task. The product code, tests, fixtures and task files are unchanged by this task (the MP07 working tree
is as handed over). Re-running the cheap commands above into a scratch folder reproduces the recorded files line by line
(ratings, clue counts, scores, results) apart from the millisecond fields; the `repairs` array exists only in `vectors` and
`pop-recipe-board`, which were re-recorded after the preload learned to record repair ratings (it matters only for `require`
calls, Q13).

Limits of the data: all sequences are `difficulty-v2`; one seed per cell and 5 puzzles per cell (10 for Hell 3 22 x 22); the
simulated rule uses the exact definition given in Q8 and its reading of "all rated candidates on one side" (in band or not);
the population experiments (10 x 6, 12 x 12 and the recipe board) are extra data beyond what was asked; their calls are part of
the 2,106 calls of the Q10 totals.

D21 MEASUREMENTS COMPLETE
