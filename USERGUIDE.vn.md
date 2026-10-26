# Hướng dẫn sử dụng Pentomino

<a id="top"></a>

[English](USERGUIDE.md) · **Tiếng Việt** · [Hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md) · [README](README.md)

**Ứng dụng trực tuyến:**
[Pentomino Generator](https://tdat00.github.io/pentomino/generator/) ·
[Pentomino Player](https://tdat00.github.io/pentomino/player/) ·
[GitHub](https://github.com/tdat00/pentomino)

- [Giới thiệu](#giới-thiệu)
- [Dùng trình tạo đề](#dùng-trình-tạo-đề)
- [Dùng trình chơi](#dùng-trình-chơi)
- [In ra giấy](#in-ra-giấy)
- [Quyền riêng tư](#quyền-riêng-tư)
- [Giấy phép](#giấy-phép)

---

## Giới thiệu

| Ứng dụng | Trực tuyến | Mã nguồn | Làm gì |
|---|---|---|---|
| **Pentomino Generator** | [tdat00.github.io/pentomino/generator](https://tdat00.github.io/pentomino/generator/) | [generator/](generator/) | Vẽ bàn chơi, tạo các bộ mảnh được chứng minh là lấp kín bàn, tạo đề từ một bộ mảnh ở mười mức độ, in đề, nhập một đề từ liên kết hoặc mã của nó và mở đề trong trình chơi |
| **Pentomino Player** | [tdat00.github.io/pentomino/player](https://tdat00.github.io/pentomino/player/) | [player/](player/) | Chơi một đề từ liên kết của nó: kéo thả hoặc chạm để đặt mảnh, hoàn tác / làm lại, gợi ý đã được chứng minh, đồng hồ, lưu tiến độ, in đề, chia sẻ một đề hoặc cả danh sách bằng liên kết kèm mã QR |

Địa chỉ `/pentomino/` chuyển thẳng tới trình tạo đề, giữ nguyên chuỗi truy vấn và phần `#hash`. Cả hai ứng dụng có tiếng
Anh và tiếng Việt, giao diện sáng, tối và tương phản cao, dùng được bằng chuột, cảm ứng và bàn phím.

Nút **Chơi** của trình tạo đề mở trình chơi trong thẻ mới bằng một **liên kết hash** mang theo các đề của danh sách dưới
dạng mã đề: `…/player/#p=<mã>;<mã>;…`, mỗi đề một mã, kèm `&i=<n>` khi đề cần mở không phải đề đầu. Khi liên kết đó quá
dài (hơn 16.000 ký tự), chỉ đề cần mở được gửi đi (và trình tạo đề cho biết điều đó). Không ứng dụng nào nhập hay xuất tệp: địa chỉ của trình chơi luôn chứa đề đang mở, nên lưu dấu trang là giữ
được đề, và gửi địa chỉ đó là chia sẻ được đề.

Muốn chạy một bản trên máy của bạn hoặc làm việc với mã nguồn, hãy xem [hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md).

[Lên đầu trang](#top)

## Dùng trình tạo đề

Trang là một trình hướng dẫn ba bước trong ba khung: bên trái là các đề của bộ mảnh đang hiển thị, ở giữa là màn hình của
bước hiện tại, bên phải là ba bước, mỗi bước một khung riêng với các thiết lập và nút của bước đó. Từ 768 px đến 1359 px,
danh sách đề chuyển xuống dưới màn hình chính. Dưới 768 px (điện thoại), trang là một cột gồm ba khung, mỗi bước một khung như trên màn hình rộng:
tiêu đề của bước, kèm phần tóm tắt của bước đã xong ngay dưới, và màn hình của bước hiện tại nằm dưới khung của nó. Các
thiết lập và nút của bước hiện tại là một thanh cố định ở cuối màn hình; các đề được hiện từng đề một với nút ◀ ▶ như các
bộ mảnh, thay cho danh sách thẻ. Bên dưới một bước đã xong, khung của nó hiện phần tóm tắt (hình mẫu và kích thước, như "Trái tim 8×15", kèm ảnh thu nhỏ của bàn chơi ngay dưới, ở bước 1; số thứ
tự, mức độ, seed và cỡ mảnh của bộ ở bước 2); nhấn vào phần tóm tắt để quay lại bước đó. Các nút điều hướng ở góc trên
bên phải màn hình chính (ví dụ **‹ Bước 1 - Tạo bàn chơi** và **Bước 3 - Tạo đề ›**) hoặc tiêu đề các bước (trên điện thoại là ba khung) dùng
để chuyển bước. Bước 2 mở khi bàn chơi đủ điều kiện để tạo bộ mảnh (nếu không, bước 1 cho biết lý do), bước 3 mở khi đã
có một bộ mảnh đang hiển thị.

1. **Tạo bàn chơi.** Chọn một hình mẫu (Hình chữ nhật, Trái tim, Hình thoi, Chữ thập hoặc Vòng) cùng số hàng và số cột
   (mỗi chiều 3–32), rồi nhấn hoặc kéo trên các ô để chặn hay bỏ chặn; ô bị chặn có nền xám và dấu chéo. Các công cụ trên
   bàn chơi dùng để phóng to, thu nhỏ, hiển thị vừa khung nhìn, bật công cụ di chuyển góc nhìn và xoay góc nhìn 45°
   (⟲ ⟳). `Ctrl`/`Cmd`+`Z` hoàn tác thay đổi gần nhất của bàn chơi; với bàn phím, các phím mũi tên di chuyển con trỏ và
   `Space` chuyển đổi trạng thái một ô. Dòng trạng thái đếm số ô chơi được và cho biết vì sao bàn chơi chưa thể tạo bộ
   mảnh.
2. **Tạo bộ mảnh.** Một bảng liệt kê mọi mức độ từ Rất dễ đến Địa ngục 3, với số mảnh, cỡ mảnh và số mảnh đặt sẵn tương
   ứng trên bàn chơi này; nút **?** cạnh mỗi con số giải thích cách tính, và các mức bàn chơi không dùng được thì bị vô
   hiệu kèm lý do. Khung của bước có ô **Seed** (✕ để xóa, 🎲 để lấy seed ngẫu nhiên) và nút **Tạo bộ mảnh mới**. Dưới
   bảng là phần tóm tắt của bộ đang hiển thị, ví dụ `Khó | 13 mảnh | Cỡ mảnh 7–12 | Seed ABCD-EFGH-JKLM`, cùng các mảnh
   của nó. ◀ **Bộ n/tổng** ▶ chuyển qua các bộ đã tạo cho bàn chơi này, **Xóa** bỏ bộ đang hiển thị cùng các đề của nó,
   **Xóa tất cả** bỏ mọi bộ của bàn chơi này sau khi xác nhận. Nút **Chọn bộ mảnh này** bên dưới các mảnh mở bước 3 với bộ
   đó. Một bộ mới trùng với bộ đã có trong danh sách sẽ không được thêm; bộ đã có sẽ được hiển thị.
3. **Tạo đề.** Khung của bước có mức độ của đề (mặc định là mức của bộ mảnh), công tắc **Yêu cầu lời giải duy nhất** và
   nút **Tạo đề mới**, mỗi lần nhấn thêm một đề. Danh sách bên trái hiện các đề của bộ đang hiển thị, mới nhất ở trên:
   **Đề #n**, mức độ in đậm kèm điểm, số mảnh cần đặt, tình trạng lời giải (*Đang kiểm tra…*, *Lời giải duy nhất ✓*,
   *Nhiều lời giải*, *Có ít nhất 1 lời giải*, *Không có lời giải* hoặc *Chưa kiểm tra tính duy nhất*) và hình xem trước.
   ✕ xóa một đề, **Xóa tất cả** ở đầu danh sách xóa hết. Màn hình chính hiện đề đang chọn (đề mới nhất cho tới khi bạn
   nhấn một thẻ) với seed, bàn chơi và các mảnh cần đặt; **Chơi** mở đề trong trình chơi ở thẻ mới, **In** (biểu tượng
   máy in bên phải nút Chơi) in đề, còn **Xem lời giải** ở góc phải bên dưới bàn chơi vẽ lời giải lên bàn cho tới khi
   nhấn lại (**Ẩn lời giải**).

Khi một tác vụ đang chạy, nút của nó hiện vòng quay và dòng *Đã chạy: m:ss* bên dưới; sau 30 giây nút đổi thành **Hủy**,
và một lượt tạo đề bị hủy vẫn giữ các đề đã tạo xong. Kết quả của thao tác gần nhất (thiếu đề, đã hủy, bộ mảnh hay đề bị
trùng) hiện phía trên màn hình chính, kèm nút **Tạo bộ mảnh mới** khi một bộ mới có thể giúp ích.

Nút **EN | VI** ở đầu trang đổi ngôn ngữ mà không tải lại trang; lựa chọn được nhớ trong trình duyệt này, và `?lang=vi`
hoặc `?lang=en` trên địa chỉ sẽ được ưu tiên. Các nút giao diện bên cạnh chọn giao diện sáng, tối hoặc tương phản cao;
nếu chưa chọn, trang theo chế độ sáng hay tối của hệ thống. Trình chơi có hai nút này giống vậy, và hai trang dùng chung
lựa chọn. Trên điện thoại (dưới 768 px), đầu trang chỉ có các biểu tượng: **Cài đặt** mở một hộp thoại với ngôn ngữ và giao
diện, còn **Nhập đề** giữ biểu tượng của nó bên cạnh.

**Nhập đề** (nút ở đầu trang, bên trái nút ngôn ngữ; trên điện thoại chỉ có biểu tượng) mở một hộp thoại để dán liên kết đề đã sao chép từ trình chơi
(**Chia sẻ**), hoặc mã đề của nó, rồi nhấn **Nhập**. Bàn chơi (theo góc nhìn của liên kết), bộ mảnh và đề,
kèm lời giải đã lưu và mức độ nếu mã có mang theo, được tạo lại: bàn chơi trở thành bàn của bước 1 và đề hiện ở bước 3
trong một bộ mảnh mới (ghi *Đã nhập*, với seed mới). Bộ mảnh đang hiện vẫn nằm trong danh sách của bàn chơi của nó. Đề
của bộ mảnh đang hiện sẽ được thêm vào bộ đó, và đề đã có trong danh sách thì không được thêm lại. Liên kết không đọc
được sẽ được giải thích ngay trong hộp thoại và không làm thay đổi gì, giống trình chơi (nếu nhiều khả năng chỉ do gõ sai
một ký tự, hộp thoại đề xuất cách sửa). Sau khi nhập, **Tạo đề mới** dùng được trên bộ mảnh đã nhập: lời giải của bộ lấy từ
liên kết nếu có, nếu không sẽ được tìm ngầm (nếu tìm không ra, nút vẫn bị tắt kèm lý do). Khi danh sách của bàn chơi đã có 50 bộ mảnh, hoặc danh sách đề đã đầy, sẽ không
nhập gì và có thông báo cho biết.

- **Bàn chơi.** Kích thước ghi theo **cột×hàng**. Góc nhìn có thể xoay theo từng bước 45°; việc xoay chỉ để hiển thị,
  không bao giờ đổi đề. Hình mẫu **Trái tim** là một bàn vuông bị chặn một phần tư góc trên bên phải, hiển thị nghiêng
  45°. Sửa bàn chơi sẽ hiện các bộ mảnh và đề đã tạo cho bàn mới, hoặc danh sách trống; quay lại một bàn trước đó sẽ đưa
  các bộ của nó trở lại.
- **Mảnh.** Một bộ mảnh có ít nhất 3 mảnh và các mảnh đều khác nhau, kể cả khi xoay hay lật. Mọi cách xếp hợp lệ lấp kín
  bàn chơi bằng bộ mảnh đều được tính là lời giải.
- **Seed.** Seed của bộ mảnh giúp tạo lại đúng bộ đó: cùng bàn chơi, mức độ, công tắc lời giải duy nhất và seed sẽ cho
  cùng một bộ. Seed bạn gõ vào hoặc lấy bằng 🎲 được dùng lại cho mỗi lần **Tạo bộ mảnh mới**; nếu để trống, mỗi lần nhấn
  sẽ lấy một seed ngẫu nhiên mới và hiển thị nó. Mỗi lần **Tạo đề mới** lấy một số ngẫu nhiên riêng làm seed của đề.
- **Cách xếp mới.** Mỗi đề là một cách xếp hoàn toàn mới so với các đề đã tạo từ bộ mảnh (xóa một đề không làm cách xếp
  của nó dùng lại được), và một đề trùng với đề đã có trong danh sách không bao giờ được thêm. Có bộ mảnh chỉ có vài cách
  xếp khác nhau. Khi một yêu cầu dừng sớm vì không tìm được cách xếp mới, trình tạo đề đếm vét cạn các cách xếp của bộ
  (các ảnh đối xứng chỉ tính một lần, trong một giới hạn công việc cố định). Nếu đếm xong, trình tạo đề nói rõ, ví dụ
  **Đã tìm được 6/6 cách xếp** (hoặc **2/2 cách xếp còn lại (tổng cộng 6)** khi các lần trước đã dùng một số), và đề nghị
  **Tạo bộ mảnh mới**. Các cách xếp mà lần tìm thông thường chưa chạm tới không bị bỏ phí: một lượt hoàn tất biến từng
  cách xếp chưa dùng thành đề theo cùng quy tắc chọn mảnh đặt sẵn, khoảng mức độ và tính khác biệt, cho tới khi đủ số đề
  hoặc hết cách xếp. Nếu không đếm xong, trình tạo đề báo thiếu một cách trung thực mà không khẳng định đó là tối đa.
- **Dữ liệu đã lưu.** Bàn chơi, các thiết lập và các bộ mảnh cùng đề của chúng được giữ trong trình duyệt này: tối đa
  **50** bộ cho mỗi bàn trong **10** bàn dùng gần nhất. Khi đã có 50 bộ, **Tạo bộ mảnh mới** bị vô hiệu cho tới khi bạn
  xóa một bộ. Một danh sách chứa tối đa **100** đề, và không quá lượng vừa một gói 512 KiB, vì **Chơi** mở cả danh sách
  thành một gói; khi danh sách đầy, **Tạo đề mới** sẽ báo.
- **Địa chỉ.** Địa chỉ chỉ chứa bước đang mở (`?step=`; `?lang=` chọn ngôn ngữ khởi đầu), nên tải lại trang sẽ trở về đúng bước; các thiết lập nằm trong
  công việc đã lưu của trình duyệt này. Một liên kết `#p=` (mỗi đề một mã, như **Chơi** tạo ra) trên địa chỉ mở **Nhập đề**
  và nhập các đề của nó. Ngoài ra đề không nằm trên địa chỉ; hãy dùng **Chơi** và chia sẻ liên kết của trình chơi.
- **Giới hạn.** Bàn chơi cần ít nhất **30** ô chơi được trong một vùng liền nhau và mỗi cạnh tối đa **32**. Khi phát hành,
  bàn chơi được dùng tới **484** ô trên máy tính và **360** ô trên điện thoại; các cỡ lớn hơn chỉ được bật sau khi qua
  kiểm định. Mỗi thao tác tạo nhắm tới **60 giây** và có
  giới hạn cứng **120 giây**; khi hết giờ nó dừng và báo những gì đã có.
- **Độ khó.** Điểm chỉ là ước lượng. Đề thông thường không chờ chứng minh tính duy nhất: tình trạng lời giải được kiểm tra
  ngầm sau khi đề xuất hiện. Một đề bạn yêu cầu lời giải duy nhất vẫn có thể không chứng minh được; khi đó trình tạo đề
  nói rõ thay vì trả về một đề chưa được chứng minh.

[Lên đầu trang](#top)

## Dùng trình chơi

Trang có cùng phong cách với trình tạo đề: đầu trang có tiêu đề, nút **EN | VI**, các nút
giao diện và **Trợ giúp**, cùng ba khung. Bên trái là các **đề** của gói đang mở, ở giữa là **ván chơi** (tên đề và mức độ cùng nút Chia sẻ và In ở bên phải tên đề, đồng hồ và số nước đi,
Hoàn tác / Làm lại / Gợi ý / Chơi lại và bàn chơi), bên phải là **các mảnh cần đặt**, dưới thanh công cụ của mảnh
đang chọn. Khung các mảnh không có thanh cuộn riêng: khi có nhiều mảnh, cả trang sẽ cuộn. Từ 768 px đến 1359 px, danh
sách đề chuyển xuống dưới ván chơi.

Trên điện thoại (dưới 768 px), đầu trang chỉ giữ biểu tượng **Cài đặt** (ngôn ngữ và giao diện) và **Trợ giúp**, các nút và
ô nhập nhỏ hơn, còn **các mảnh cần đặt** là một thanh cố định ở cuối màn hình: một hàng mảnh để vuốt ngang. Vuốt một mảnh
lên để nhấc nó lên bàn chơi; nhấn giữ một mảnh để mở menu của nó (xoay, lật), thay cho các nút xoay và lật của bố cục
rộng. Các đề của gói được hiện từng đề một, với nút ◀ ▶ phía trên tên đề (và **Xóa**, **Xóa tất cả** ngay dưới), thay cho danh
sách thẻ.

- **Mở một đề.** Mở một liên kết của trình chơi: nút **Chơi** của trình tạo đề, hoặc một địa chỉ được chia sẻ hay đã lưu
  dấu trang. Khi chưa có đề, trang hiện màn hình bắt đầu với **Thử đề mẫu** và liên kết tới trình tạo đề. Liên kết chỉ có
  mảnh mà không có đề sẽ được giải thích, và một liên kết không mở được không bao giờ thay thế đề bạn đang chơi. Một đề
  cũng mở được từ liên kết mã đề của nó, `…/player/#p=<mã>`, và nhiều đề từ `…/player/#p=<mã1>;<mã2>;…` (có thể kèm
  `&i=<n>`, đề cần mở, đếm từ 0; các đề phải cùng một bàn chơi và một bộ mảnh, và không được lặp): mỗi mã được giải
  trong một worker chạy nền, không cần trình tạo đề hay bản sao đã lưu, giữ tiến độ đã lưu của bạn, và tải lại sẽ mở lại
  đúng các đề đó. Với một mã, địa chỉ không bao giờ bị viết lại; với nhiều mã, địa chỉ đi theo đề đang mở (`&i=`). Địa chỉ
  luôn chứa gói và đề đang mở. Mỗi thẻ trong danh sách đề (tên, mức độ và điểm, số mảnh cần đặt, tính duy nhất, tiến độ,
  hình xem trước), mới nhất ở trên, mở đề đó; ✕ trên thẻ xóa đề và **Xóa tất cả** làm trống danh sách.
- **Nhập mã đề.** Không có nút riêng: hộp thoại **mã đề** tự mở khi một địa chỉ `#p=` (liên kết hoặc mã QR đã quét) không mở
  được, với địa chỉ làm văn bản, để bạn sửa mã. Hộp thoại nhận mã in kèm đề, hoặc
  cả liên kết của đề, hoặc nhiều mã cách nhau bằng `;`. Dấu cách, dấu xuống dòng và dấu gạch ngang được bỏ qua, chữ thường cũng được, và chữ O, I, L được
  đọc là 0, 1, 1; phần sau dấu chấm là không bắt buộc, và một mã dài tối đa 16.000 ký tự (32.768 khi gõ hoặc dán, tối đa
  100 mã).
  **Mở đề** sẽ mở đề, và địa chỉ trở thành `#p=<mã>`. Mã không mở được sẽ được giải thích ngay trong hộp thoại (với danh
  sách thì kèm số thứ tự của đề) và không
  làm thay đổi gì: văn bản của bạn, đề đang mở, các nước đi và địa chỉ vẫn như cũ. Nếu nhiều khả năng chỉ do gõ sai một
  ký tự, hộp thoại cho biết vị trí và ký tự có thể đúng; không có gì được sửa cho đến khi bạn nhấn **Dùng cách sửa này**.
  Nếu chỉ phần sau dấu chấm bị hỏng, **Mở đề không có phần lời giải** mở đề từ phần đứng trước nó (lời giải khi đó được
  tìm ngầm);   cả hai gợi ý này chỉ có với một mã, không có với danh sách. Các nước đi đã lưu của đề được khôi phục lặng lẽ (cả khi bạn tải lại trang hoặc quét liên kết
  của đề); **Chơi lại** bắt đầu lại như bản in.
  **Hủy** hoặc `Escape` đóng hộp thoại.
- **Chia sẻ đề.** **Chia sẻ** (biểu tượng bên trái nút **In**, trên hàng tên đề, ở bên phải hàng; chỉ có trong trình
  chơi) mở một cửa sổ có liên kết của đề đang hiện, `…/player/#p=<mã>`, trong một ô chỉ đọc, cạnh đó là mã QR để quét bằng
  điện thoại: đó là địa chỉ mà mã QR trên bản in mang theo cho đề, kèm lời giải đã lưu khi vừa. Khi danh sách có hơn một
  đề, **Chia sẻ tất cả các đề trong danh sách** tạo một liên kết cho cả danh sách, mở ở đề đang chọn. **Sao chép liên kết**
  sao chép liên kết đó; "Đã sao chép" chỉ xuất hiện sau khi trình duyệt đã nhận văn bản, và nếu trình duyệt từ chối bảng
  nhớ tạm thì liên kết được chọn sẵn trong ô để bạn tự sao chép. Khi liên kết quá dài cho một mã QR, lời giải đã lưu được
  bỏ đi trước, rồi mã QR dùng mức sửa lỗi thấp hơn, và chỉ khi đó vẫn không được mới không có mã QR (mỗi bước đều có ghi
  chú); liên kết dài hơn 4.000 ký tự có cảnh báo, còn dài hơn 16.000 ký tự thì không được tạo. Các bộ mã hóa khác nhau có
  thể viết văn bản mã khác nhau nhưng tương đương cho cùng một đề; đề mà nó mở ra là như nhau.
- **Thông tin và kiểm tra.** Mức độ và tính duy nhất do gói mang theo được hiển thị đúng như gói ghi, với mức độ in đậm.
  Đề chưa có kết quả về tính duy nhất sẽ ghi *Có ít nhất 1 lời giải* khi đã biết một lời giải. Khả năng giải được kiểm tra
  ngầm; việc chơi không bao giờ bị chặn, và *chưa xác minh khả năng giải* không bao giờ có nghĩa là *không có lời giải*.
- **Đặt mảnh.** Kéo một mảnh lên bàn chơi (trong khung các mảnh, nhấn vào bất kỳ đâu trong khung của mảnh để cầm nó; con
  lăn chuột xoay mảnh khi đang cầm), hoặc chọn một mảnh, chạm hay nhấn vào một ô để xem trước rồi chạm lại ô đó hoặc nhấn
  `Enter` để đặt. Thả mảnh lên khung các mảnh để trả nó về. Một lần thả không vừa, `Escape`, việc đổi kích thước cửa sổ
  hoặc thao tác chạm bị gián đoạn đều trả mảnh về; các mảnh đặt sẵn bị khóa. Mảnh đã đặt có thể kéo sang chỗ khác nhưng
  không bao giờ được xoay hay lật ngay trên bàn: xoay hoặc lật nó (menu, thanh công cụ hoặc phím) sẽ trả nó về khay, xoay
  hoặc lật ở đó, thành một bước có thể hoàn tác.
- **Menu mảnh.** Nhấn chuột phải vào một mảnh (trong khung các mảnh, hoặc mảnh đã đặt trên bàn), hoặc nhấn giữ nó
  trên màn hình cảm ứng, để xoay, lật hoặc trả nó về khay (mảnh đã đặt sẽ trở về khay trước). Phím Menu hoặc `Shift`+`F10` mở menu cho mảnh đang được chọn. Nhấn chuột phải trên bàn chơi còn có
  **Trả mọi mảnh về khay** và **Chơi lại đề** (sau khi xác nhận).
- **Bàn phím.** `E` hoặc `R` xoay mảnh đang chọn theo chiều kim đồng hồ, `Q` theo chiều ngược lại; `F` và `V` lật mảnh
  trái-phải và trên-dưới trên màn hình; phím mũi tên di chuyển một ô và `Shift`+mũi tên ba ô; `Enter` hoặc `Space` nhấc
  mảnh lên hoặc đặt bản xem trước hợp lệ; `Escape` hủy; `Delete` hoặc `Backspace` trả mảnh về khay; `Ctrl`/`Cmd`+`Z`
  hoàn tác, `Ctrl`/`Cmd`+`Shift`+`Z` hoặc `Ctrl`+`Y` làm lại; `?` hoặc **Trợ giúp** liệt kê các phím tắt.
- **Hoàn thành.** Mọi cách xếp đầy đủ và hợp lệ đều thắng, không chỉ đáp án đã lưu. Hộp thoại chiến thắng chúc mừng bằng
  biểu tượng cúp và một lời khen ngắn, hiện thời gian, số nước đi (và số gợi ý đã dùng), cùng các nút nhỏ **Đề tiếp theo**,
  **Chơi lại** và **Đóng** ở góc dưới bên phải. **Chơi lại** (cũng là nút mũi tên vòng trên thanh ván chơi, có hỏi xác nhận)
  bắt đầu lại đề: mọi mảnh về khay, đồng hồ và số nước đi về 0, tiến độ đã lưu của đề bị xóa.
- **Gợi ý.** Nút **Gợi ý** (bóng đèn) chỉ đưa ra những khẳng định đã được chứng minh, tính trong một worker chạy nền. Nó
  hoặc tô sáng thêm một mảnh khớp với một lời giải hoàn chỉnh giữ nguyên mọi mảnh bạn đã đặt (**Đặt mảnh này** đặt nó
  thành một nước có thể hoàn tác), hoặc chứng minh rằng gỡ một mảnh được nêu tên thì đề vẫn hoàn thành được mà giữ nguyên
  mọi mảnh khác (**Gỡ mảnh này**). Nếu không, câu trả lời là không tìm thấy cách sửa trong lần kiểm tra này: hết giờ hay
  tìm kiếm bị giới hạn không bao giờ được coi là chứng minh. Kết quả bị bỏ nếu bạn thay đổi bàn chơi trong lúc đang tính.
- **Xem lời giải.** (Hiện trang chưa có nút cho chức năng này.) Có hỏi trước, giữ các mảnh đặt sẵn và điền một lời giải
  phù hợp với các mảnh của bạn; nếu không thể hoàn thành từ các mảnh đó, bạn sẽ được hỏi **Đặt lại rồi xem lời giải**. Đề
  khi đó được đánh dấu **Đã xem lời giải**: không có hộp thoại chiến thắng, không tính là đã giải, cho tới khi
  **Chơi lại** bắt đầu một lượt mới.
- **Hiển thị.** Mỗi mảnh hiện chữ cái của nó khi các ô đủ lớn (phóng to để thấy thêm). Nhãn luôn là một ký tự: sau Z, chữ
  cái được vẽ trong vòng tròn, trong hình vuông hoặc trên nền tròn đen. Màu và chữ vẫn dễ đọc khi in trắng đen, và các bộ
  hơn 20 mảnh có thêm hoa văn tô. Ngôn ngữ và giao diện được nhớ trong trình duyệt này.
- **Tiến độ** được lưu trên máy và khôi phục khi mở lại cùng đề.

[Lên đầu trang](#top)

## In ra giấy

Nút **In** (biểu tượng máy in: bên phải **Chơi** trong trình tạo đề, bên phải tên đề trong trình chơi) mở hộp thoại
in đề ra giấy A4, để giải ngoại tuyến với các mảnh cắt rời.

- Tờ đầu tiên có một **mã QR** ở góc trên bên trái, dưới chú thích "Chơi trực tuyến", và bên phải là tên đề (đúng tên
  thẻ đề trong danh sách: "Đề #n") cùng mức độ và điểm của đề. Quét mã QR để
  chơi lại đúng đề này trong trình chơi, không cần seed. Tờ giấy không in mã đề, địa chỉ hay seed. Sau đó là một hình xem
  trước nhỏ của đề với các mảnh cần đặt (để đọc, không để cắt).
- **Nhiều đề.** Khi danh sách có nhiều hơn một đề, hộp thoại có hai cột. Cột bên phải có **Số đề mỗi trang** (1, 2 hoặc 4)
  và **Đề cần in**: các đề trong danh sách theo thứ tự của khung bên cạnh (mới nhất trước), mỗi đề ghi dạng "Đề #n · Mức
  độ: điểm n", cùng nút **Chọn tất cả** và **Bỏ chọn**; đề đang hiện được chọn sẵn khi mở hộp thoại. Các đề đã chọn được
  in theo thứ tự số, mỗi đề có mã QR riêng, trên các tờ đầu, 1, 2 (chồng lên nhau) hoặc 4 (hai nhân hai) đề mỗi tờ, có
  đường nét đứt để cắt; mã QR quá lớn so với một phần tư tờ sẽ được vẽ nhỏ lại. Bộ mảnh và bàn chơi chỉ in một lần, dù có
  bao nhiêu đề.
- **Mã QR** được tạo ngay trên máy khi mở hộp thoại (nút **In** chờ "Đang chuẩn bị mã đề…"). Khi đề có lời giải đã lưu,
  lời giải nằm trong mã; việc đó không in tờ lời giải. Mã không bao giờ bị cắt ngắn; trong trường hợp hiếm khi mã quá dài
  cho một mã QR, phần lời giải không bắt buộc được bỏ đi, rồi mã QR dùng mức sửa lỗi thấp hơn, và nếu vẫn không được thì
  tờ giấy nói rõ và không in mã QR. Hộp thoại báo từng việc này trước khi in.
- **Mã QR dẫn tới đâu**: luôn tới trình chơi của trang bạn in (cả khi là `localhost`, địa chỉ mạng nội bộ hay một tệp);
  không có lựa chọn để đổi. **Chia sẻ** (xem [Dùng trình chơi](#dùng-trình-chơi)) trỏ tới cùng trang và mang cùng mã.
- **In cả bộ mảnh**: mọi mảnh của bộ, kể cả các mảnh đặt sẵn, sẵn sàng để cắt.
- **In cả bàn chơi**: các ô chơi được. Bàn chơi quá lớn so với một tờ sẽ được chia thành nhiều phần; một dấu có đánh số
  trên mỗi cạnh chung cho biết phần nào ghép vào đó.
- **In hai mặt**: mỗi mảnh và mỗi phần bàn chơi được in đối xứng ở mặt sau, nên khi cắt ra hai mặt khớp nhau (chọn in hai
  mặt, lật theo cạnh dài).
- **In lời giải** (chỉ có trong trình tạo đề): bàn chơi đã giải ngay sau đề (khi in hai mặt thì ở mặt sau của đề). Khi in
  nhiều đề trên một tờ, lời giải của các đề trên tờ đó nằm chung ở tờ kế tiếp, mỗi lời giải sau lưng đề của nó khi in hai
  mặt.
- **Cỡ bàn chơi**: một bảng gồm Nhỏ, Vừa và Lớn (ô 10, 15 và 20 mm) và Vừa một tờ, kèm số tờ A4 mỗi cỡ cần. Các mảnh dùng
  cùng kích thước ô với bàn chơi nên đặt lên khớp chính xác.

Hãy in ở tỉ lệ 100% (kích thước thật): thanh 50 mm trên tờ đầu cho biết máy in có co giãn trang hay không. Góc nhìn chéo
(Trái tim) được in theo lưới gốc, vì giấy không thể xoay 45°.

[Lên đầu trang](#top)

## Quyền riêng tư

- Mọi thứ ở lại trong trình duyệt của bạn: không tài khoản, không tải lên, không bộ giải từ xa, không thu thập số liệu.
  Một đề đi theo phần `#p=` của liên kết, phần mà trình duyệt không bao giờ gửi lên máy chủ. Liên kết chia sẻ có thể
  không kèm đáp án.
- Trình tạo đề giữ công việc của bạn (bàn chơi, thiết lập, các bộ mảnh và đề của chúng) trong trình duyệt này; trình
  chơi giữ tiến độ của tối đa 300 đề. Cả hai nhớ ngôn ngữ và giao diện. Trình chơi không lưu danh sách đề: danh sách
  nằm trong liên kết, nên hãy giữ hoặc lưu dấu trang liên kết đó.
- Bộ nhớ trình duyệt có thể bị tắt, dùng chung hoặc đầy. Khi đầy, các mục đã lưu cũ nhất bị xóa một lần (trình tạo đề
  xóa các bộ mảnh cũ nhất trước); nếu vẫn không lưu được, bạn vẫn làm tiếp được, trang báo rằng công việc không thể lưu,
  và công việc sẽ mất khi bạn đóng thẻ.

[Lên đầu trang](#top)

## Giấy phép

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le. Các phần của bên thứ ba được liệt kê trong
[hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#giấy-phép).

[Lên đầu trang](#top)
