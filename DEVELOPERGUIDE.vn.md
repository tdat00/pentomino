# Hướng dẫn cho lập trình viên Pentomino

<a id="top"></a>

[English](DEVELOPERGUIDE.md) · **Tiếng Việt** · [Hướng dẫn sử dụng](USERGUIDE.vn.md) · [README](README.md)

**Ứng dụng trực tuyến:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/) ·
[GitHub](https://github.com/tdat00/pentomino)

- [Trạng thái dự án](#trạng-thái-dự-án)
- [Chạy trên máy](#chạy-trên-máy)
- [Phát triển và kiểm thử](#phát-triển-và-kiểm-thử)
- [Bộ nhớ trình duyệt](#bộ-nhớ-trình-duyệt)
- [Xuất bản](#xuất-bản)
- [Tài liệu](#tài-liệu)
- [Cách đóng góp](#cách-đóng-góp)
- [Giấy phép](#giấy-phép)

---

## Trạng thái dự án

> **Trạng thái.** Kho mã được xây dựng theo từng nhiệm vụ, nên một tính năng nêu ở đây có thể chưa hoàn tất. Việc nghiệm
> thu bản phát hành (ma trận trình duyệt, ngưỡng hiệu năng) được theo dõi riêng, và nội dung dưới đây không hứa hẹn thời
> gian chạy trên trình duyệt trước khi có kết quả kiểm định đó. Việc nghiệm thu tự động cho chuỗi in mã đề, đọc lại mã và
> mở đề trong Trình chơi (`puzzle-code-acceptance.html` và `tests/puzzlecode-acceptance.test.js`) không thay cho bản in
> thật: quét mã QR trên giấy bằng camera điện thoại Android và iPhone thật, thanh 50 mm của bản in vật lý ở 100 % và nhập
> mã đề in trên giấy bằng điện thoại vẫn là các việc kiểm tra của chủ dự án trước khi phát hành.

[Lên đầu trang](#top)

## Chạy trên máy

Hai ứng dụng dùng ES module và worker gốc của trình duyệt, nên phải được phục vụ qua HTTP (không hỗ trợ `file://`). Hãy
dùng máy chủ tĩnh đi kèm, vốn trả đúng kiểu MIME cho `.js` và `.mjs`:

```text
node tools\serve.mjs --port 8080 --prefix /pentomino/
```

Rồi mở `http://localhost:8080/pentomino/`. Lệnh tương đương: `npm run serve`. Tùy chọn: `--root DIR`, `--port N`,
`--prefix /path/`, `--host ADDR` (`--prefix /` để thử khi đặt ở gốc). Trên Windows, `run.cmd [port]` chạy cùng máy chủ đó
(cổng mặc định 8080) và mở trình tạo đề; đặt `NO_BROWSER=1` để không mở trình duyệt.

[Lên đầu trang](#top)

## Phát triển và kiểm thử

Node.js 22 trở lên. Không có bước biên dịch và không có thư viện chạy kèm.

```text
npm run check        # quy ước của kho mã (UTF-8, ký tự xuống dòng, dòng trống cuối tệp, không khoảng trắng thừa) và tham chiếu của trang
npm run test:quick   # kiểm thử đơn vị, bỏ qua các bài chạy chậm: node --test --test-skip-pattern=slow "tests/**/*.test.js"
npm test             # toàn bộ kiểm thử đơn vị: node --test "tests/**/*.test.js"
```

- **Trang kiểm thử trên trình duyệt** (không được xuất bản): chạy `npm run serve` rồi mở
  `http://localhost:8080/pentomino/tests/browser/` kèm `player-controls.html`, `player-load.html`, `hints.html`,
  `print.html`, `rendering.html`, `generator-flow.html`, `generator-editor.html`, `puzzle-code-worker.html`,
  `puzzle-code-entry.html`, `puzzle-code-print.html`, `puzzle-code-cli-parity.html`, `puzzle-code-acceptance.html`,
  `puzzle-qr.html`, `watchdog.html` hoặc `acceptance.html`. Mỗi trang ghi danh sách đạt/không đạt, cùng `data-summary`
  và `data-result` (`pass` hoặc `fail`) trên `<html>`. Hãy dùng cửa sổ hẹp hơn
  1360 px: một số bài kiểm tra cần bố cục một hoặc hai cột.
- **Tạo đề không cần giao diện**: `node tools\generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4`.
  Công cụ nhận bàn tới **676** ô chơi được (các ứng dụng dùng tới 484 ô trên máy tính và 360 ô trên điện thoại).
  Gói đề in ra stdout (hoặc `--output`), thông báo ra stderr. Mã thoát: `0` hoàn tất (kể cả khi bộ mảnh đã được tìm đủ và
  chứng minh là hết cách xếp); `2` gói hợp lệ nhưng thiếu hoặc bị hủy; `1` không có kết quả dùng được hoặc đầu vào sai.
  Thêm `--code` (cờ không có giá trị, dùng được cả với `--recipe`) để in mã đề của từng đề được chấp nhận thay cho gói
  đề: mỗi đề một dòng, viết hoa, không chia nhóm, theo thứ tự trong gói, đúng mã mà nút In tạo cho đề đó (xem [In ra giấy](USERGUIDE.vn.md#in-ra-giấy)). Với `--output tệp`, gói đề vẫn được ghi vào tệp; không có thì không tạo tệp nào. Thông báo và lỗi vẫn ra stderr,
  còn mã thoát và việc tạo đề không đổi, ví dụ
  `node tools\generate.mjs --recipe tests\fixtures\generation-case.json --workers 1 --code --output pack.json`.
- **Hiệu năng và hiệu chỉnh** (chỉ để sàng lọc; không bao giờ thay đổi ngưỡng kiểm định):
  `node --max-old-space-size=2048 tools\calibrate.mjs --matrix tools\bench\matrices\smoke.json --workers 4 --fresh-process --output docs\calibration\node-smoke`,
  bản đồ điểm (`--profile landscape`, chạy nhiều giờ, tiếp tục được), và trang trình duyệt
  `http://localhost:8080/pentomino/tools/bench/` (giữ thẻ ở phía trước).

**Cấu trúc mã.** ES module gốc với kiểu JSDoc và `// @ts-check`, chia thành các lớp:

```text
core/engine/    logic thuần, tất định: hình học, bàn chơi, lát kín, tạo đề, chấm độ khó, gói đề, mã đề (không DOM, đồng hồ hay lưu trữ)
core/browser/   hiển thị (bàn chơi SVG), lưu trữ, đa ngôn ngữ, giao diện, xử lý con trỏ, in, client tạo đề và client mã đề
core/workers/   module worker chạy việc tạo đề và mã đề ngoài luồng chính, có cơ chế hủy và giới hạn thời gian
generator/      Pentomino Generator: trang, trạng thái, tác vụ và giao diện
player/         Pentomino Player: trang, trạng thái, ván chơi, gợi ý và giao diện
tests/          kiểm thử đơn vị Node (*.test.js) và các trang kiểm thử trình duyệt (tests/browser/)
tools/          công cụ chỉ chạy bằng Node (.mjs): máy chủ, tạo đề không giao diện, hiệu chỉnh, kiểm tra trang
```

Mọi module được trang hoặc worker nạp đều dùng đuôi `.js`; `.mjs` dành riêng cho công cụ Node. Chữ trên giao diện nằm
trong các gói phẳng `generator/locale.en.js` / `locale.vi.js` và `player/locale.en.js` / `locale.vi.js` (chữ khi in nằm
trong `core/browser/print-texts.js`), được tra qua `core/browser/i18n.js`. Gói tiếng Anh có mọi khóa; gói tiếng Việt có
cùng các khóa và `{placeholder}`, điều mà các kiểm thử i18n kiểm tra. Một dòng chữ hiển thị mới cần có khóa trong cả hai
gói.

[Lên đầu trang](#top)

## Bộ nhớ trình duyệt

- Không có gì được tải lên: một đề đi theo phần `#p=` của liên kết (mỗi đề một mã, cách nhau bằng `;`), phần mà trình
  duyệt không bao giờ gửi lên máy chủ.
- Cả hai ứng dụng chỉ dùng các khóa `localStorage` có tiền tố `pentomino:v1:`, và không bao giờ đụng tới các khóa khác
  của cùng nguồn gốc:
  - trình tạo đề: công việc của bạn (bàn chơi, thiết lập, bộ mảnh và đề) trong `gen:state`;
  - trình chơi: tiến độ của từng đề (`progress:<fingerprint>`, tối đa 300, thời điểm lưu trong `progress-index`);
    không lưu gói nào, gói nằm trong liên kết của nó;
  - cả hai: ngôn ngữ (`lang`) và giao diện (`theme`).
- Bộ nhớ trình duyệt có thể bị tắt, dùng chung hoặc đầy. Khi vượt hạn mức, các mục cũ nhất trong không gian tên này bị xóa
  một lần (trình tạo đề xóa các bộ mảnh đã lưu cũ nhất trước); nếu vẫn không lưu được, công việc tiếp tục trong bộ nhớ và
  trang báo rằng không thể lưu.

[Lên đầu trang](#top)

## Xuất bản

`.github/workflows/pages.yml` chạy các kiểm thử, dựng bản trang, đóng dấu phiên bản và kiểm tra nó trước khi xuất bản lên
GitHub Pages; nếu có lỗi thì việc triển khai dừng lại. Chỉ `index.html`, `redirect.js`, `core`, `generator` và `player`
được triển khai. Trang nằm dưới `/pentomino/`, nên mọi liên kết đều là đường dẫn tương đối.

| Địa chỉ | Nội dung |
|---|---|
| [tdat00.github.io/pentomino/](https://tdat00.github.io/pentomino/) | chuyển thẳng tới trình tạo đề |
| [tdat00.github.io/pentomino/generator/](https://tdat00.github.io/pentomino/generator/) | Pentomino Generator |
| [tdat00.github.io/pentomino/player/](https://tdat00.github.io/pentomino/player/) | Pentomino Player |

```text
node tools\stamp-version.mjs _site abc12345
node tools\check-site.mjs _site --expect-version abc12345
node tools\check-site.mjs . --entry tools/bench/index.html
node tools\serve.mjs --root _site --port 8081 --prefix /pentomino/
```

- `stamp-version.mjs <siteDir> <sha8>` chỉ chạy trên bản sao đã dựng và thêm `?v=<sha8>` vào mọi tham chiếu tương đối tới
  tài nguyên và module (HTML, `import`, `export … from`, `new URL(…, import.meta.url)`, CSS `@import`/`url()`), nên một
  module không bao giờ bị nạp hai lần; các mẫu động không phân giải được sẽ làm lệnh thất bại mà không ghi gì.
- `check-site.mjs <root>` phân giải HTML, import, URL của worker, tài nguyên CSS và trang mục lục thư mục, và báo lỗi khi
  thiếu tệp, có tài nguyên dùng đường dẫn tuyệt đối từ gốc hoặc bên ngoài, trình duyệt nạp `.mjs`, có script hay style
  nội tuyến, thiếu Content Security Policy, hoặc lẫn phiên bản. `--expect-version <sha8>` còn yêu cầu mọi tham chiếu mang
  đúng phiên bản đó; `--entry <relativeHtml>` chỉ kiểm tra các trang được chỉ định.

Không có service worker. GitHub Pages lưu bộ nhớ đệm tới mười phút, vì vậy mọi tham chiếu đều mang phiên bản của commit.

[Lên đầu trang](#top)

## Tài liệu

- [docs/design-brief.md](docs/design-brief.md): trải nghiệm người dùng của trình tạo đề và trình chơi.
- [docs/design-detail.md](docs/design-detail.md): đặc tả cho lập trình viên (bộ máy, định dạng, worker, lưu trữ, địa chỉ,
  cả hai ứng dụng).

Cả hai là tài liệu sống, luôn được cập nhật theo mã. `docs/init-design/` chứa thiết kế ban đầu và hồ sơ quá trình, giữ
nguyên không sửa. [AGENTS.md](AGENTS.md) hướng dẫn cách các tác tử AI làm việc ở đây.

[Lên đầu trang](#top)

## Cách đóng góp

1. Đọc [AGENTS.md](AGENTS.md): tệp liệt kê các quy ước và bước kiểm tra mà mọi thay đổi phải theo (viết cho các tác tử
   AI, nhưng áp dụng cho mọi người).
2. Chạy ứng dụng trên máy ([Chạy trên máy](#chạy-trên-máy)) và sửa đúng lớp mã ([Cấu trúc mã](#phát-triển-và-kiểm-thử)):
   logic thuần ở `core/engine/`, mã trình duyệt ở `core/browser/`, mã của ứng dụng ở `generator/` hoặc `player/`. Một
   dòng chữ hiển thị mới cần có khóa trong cả hai gói ngôn ngữ.
3. Chạy `npm run check` và `npm run test:quick` (và `npm test` trước khi tạo pull request); chạy trang kiểm thử trình
   duyệt của phần bạn sửa. Mỗi lần chạy kiểm thử phải xong trong 10 phút.
4. Khi hành vi, lưu trữ, địa chỉ hay giao diện thay đổi, cập nhật [docs/design-brief.md](docs/design-brief.md) và
   [docs/design-detail.md](docs/design-detail.md), cùng hướng dẫn sử dụng hoặc hướng dẫn này, bằng cả tiếng Anh và
   tiếng Việt, trong cùng thay đổi.
5. Mỗi commit một thay đổi có ý nghĩa, rồi tạo pull request vào `main`.

[Lên đầu trang](#top)

## Giấy phép

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le.

Kho mã còn chứa hai tệp nguồn của bên thứ ba, không phải gói npm, nên ứng dụng vẫn không có phụ thuộc lúc chạy:
[thư viện tạo mã QR của Nayuki](https://www.nayuki.io/page/qr-code-generator-library) (MIT) trong
`core/browser/vendor/`, kèm thông báo bản quyền trong `qrcodegen.LICENSE`; và, chỉ cho kiểm thử, jsQR 1.4.0 (Apache-2.0)
trong `tests/vendor/`, không bao giờ thuộc về trang web.

[Lên đầu trang](#top)
