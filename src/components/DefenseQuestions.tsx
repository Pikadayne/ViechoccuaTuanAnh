import React, { useState } from 'react';
import { Copy, Check, HelpCircle } from 'lucide-react';

interface QAItem {
  id: string;
  part: 'Bài 1' | 'Bài 2';
  question: string;
  answer: string;
}

const DEFENSE_QA_DATA: QAItem[] = [
  // Nhóm Bài 1
  {
    id: 'b1-q1',
    part: 'Bài 1',
    question: '1. Vì sao reload làm mất thay đổi ở Bài 1?',
    answer:
      'Ở Bài 1, dữ liệu công việc chỉ được lưu tạm thời trong bộ nhớ RAM của trình duyệt thông qua React state (useState). Do chưa kết nối cơ sở dữ liệu lưu trữ lâu dài, khi người dùng nhấn F5 hoặc tải lại trang, toàn bộ state trong RAM bị xóa và ứng dụng khởi tạo lại mảng dữ liệu mặc định ban đầu.',
  },
  {
    id: 'b1-q2',
    part: 'Bài 1',
    question: '2. page.tsx khác TaskItem như thế nào?',
    answer:
      'page.tsx là component cấp trang (route component) trong Next.js App Router, quản lý bố cục tổng thể, luồng dữ liệu và các tương tác chung của một trang cụ thể (như /tasks hay /login). Trong khi đó, TaskItem là một component con tái sử dụng, chỉ chịu trách nhiệm hiển thị và xử lý hành động (hoàn thành, sửa, xóa) cho từng dòng công việc đơn lẻ.',
  },
  {
    id: 'b1-q3',
    part: 'Bài 1',
    question: '3. Vì sao form đăng nhập ở Bài 1 chưa phải đăng nhập thật?',
    answer:
      'Form ở Bài 1 chỉ là giao diện mẫu (UI mockup) theo thiết kế Stitch. Nó chưa gửi thông tin lên máy chủ xác thực (Supabase Auth), không kiểm tra tính hợp lệ của mật khẩu, không cấp JWT access token và người dùng vẫn có thể điều hướng tự do sang trang /tasks mà không cần phiên đăng nhập hợp lệ.',
  },

  // Nhóm Bài 2
  {
    id: 'b2-q1',
    part: 'Bài 2',
    question: '1. Dữ liệu nằm ở đâu sau khi tắt máy phát triển?',
    answer:
      'Sau khi tắt máy phát triển (dừng tiến trình dev server), toàn bộ dữ liệu công việc đã được lưu trữ an toàn trong bảng public.tasks trên hệ quản trị cơ sở dữ liệu PostgreSQL của Supabase trên đám mây (cloud). Khi bật lại máy hoặc truy cập từ thiết bị khác, dữ liệu vẫn được bảo toàn nguyên vẹn.',
  },
  {
    id: 'b2-q2',
    part: 'Bài 2',
    question: '2. Vì sao backend không nhận user_id từ form để xác định chủ sở hữu?',
    answer:
      'Dữ liệu gửi từ form hoặc body request có thể bị người dùng chỉnh sửa tùy ý bằng Developer Tools hoặc công cụ gửi HTTP request (curl, Postman). Nếu backend tin cậy user_id gửi lên từ form, một người dùng có thể mạo danh ID của người khác để tạo hoặc chiếm quyền dữ liệu. Do đó, backend bắt buộc phải xác minh token qua authRequest để lấy ID chính xác từ phiên đăng nhập thực tế.',
  },
  {
    id: 'b2-q3',
    part: 'Bài 2',
    question: '3. RLS khác ẩn nút Sửa như thế nào?',
    answer:
      'Ẩn nút Sửa chỉ là biện pháp hiển thị ở tầng giao diện người dùng (Frontend); người dùng vẫn có thể dùng công cụ mạng để gửi trực tiếp lệnh PATCH/DELETE đến API. Ngược lại, Row Level Security (RLS) là quy tắc bảo mật được cưỡng chế trực tiếp tại tầng cơ sở dữ liệu PostgreSQL: database sẽ kiểm tra điều kiện auth.uid() = user_id trên từng dòng bản ghi trước khi thực hiện thao tác, ngăn chặn triệt để mọi truy cập trái phép.',
  },
  {
    id: 'b2-q4',
    part: 'Bài 2',
    question: '4. Vì sao getSession phía trình duyệt chưa đủ để API tin người dùng?',
    answer:
      'getSession ở trình duyệt chỉ đọc phiên lưu tạm ở bộ nhớ client (Local Storage / Cookie) nhằm mục đích phục vụ hiển thị giao diện. API backend là cổng tiếp nhận độc lập có thể bị gọi từ bất kỳ nguồn nào ngoài trình duyệt; vì thế backend phải gửi access token lên Supabase Auth Server qua hàm getUser(token) để xác thực tính hợp lệ và thời hạn của token trước khi xử lý.',
  },
  {
    id: 'b2-q5',
    part: 'Bài 2',
    question: '5. Vì sao npm run build thành công chưa chứng minh phân quyền đúng?',
    answer:
      'Lệnh npm run build chỉ kiểm tra tính hợp lệ về cú pháp TypeScript, import và đóng gói ứng dụng. Lệnh này không chạy thử ứng dụng thực tế và không kiểm tra logic nghiệp vụ phân quyền hay kịch bản tài khoản B cố tình truy cập dữ liệu của tài khoản A. Để chứng minh phân quyền đúng, bắt buộc phải thực hiện các kịch bản kiểm thử tích hợp (integration tests) giữa hai tài khoản độc lập.',
  },
  {
    id: 'b2-q6',
    part: 'Bài 2',
    question: '6. Sau khi đổi env trên Vercel cần làm gì?',
    answer:
      'Sau khi thay đổi hoặc thêm biến môi trường trên Vercel (đặc biệt là các biến có tiền tố NEXT_PUBLIC_), người dùng bắt buộc phải bấm Redeploy để Vercel thực hiện build lại mã nguồn và đưa giá trị biến môi trường mới vào phiên bản đang phục vụ.',
  },
];

export const DefenseQuestions: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const part1Items = DEFENSE_QA_DATA.filter((i) => i.part === 'Bài 1');
  const part2Items = DEFENSE_QA_DATA.filter((i) => i.part === 'Bài 2');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Câu hỏi bảo vệ bài thực hành
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Tài liệu tổng hợp các câu hỏi hiểu bài trọng tâm cho Bài thực hành 1 và Bài thực hành 2,
          hỗ trợ sinh viên ôn tập và chuẩn bị nội dung vấn đáp với giảng viên.
        </p>
      </div>

      {/* Nhóm Bài thực hành 1 */}
      <section aria-labelledby="heading-part1" className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 id="heading-part1" className="text-base font-bold text-slate-900">
            Bài thực hành 1: Giao diện Stitch & Quản lý trạng thái React
          </h2>
        </div>

        <div className="space-y-4">
          {part1Items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>{item.question}</span>
                </h3>
                <p className="mt-2.5 text-xs text-slate-700 leading-relaxed pl-6">
                  {item.answer}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(`${item.question}\nTrả lời: ${item.answer}`, item.id)
                  }
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-md hover:bg-slate-50 transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép câu trả lời</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nhóm Bài thực hành 2 */}
      <section aria-labelledby="heading-part2" className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 id="heading-part2" className="text-base font-bold text-slate-900">
            Bài thực hành 2: Backend API, Supabase Auth & Phân quyền RLS
          </h2>
        </div>

        <div className="space-y-4">
          {part2Items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>{item.question}</span>
                </h3>
                <p className="mt-2.5 text-xs text-slate-700 leading-relaxed pl-6">
                  {item.answer}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(`${item.question}\nTrả lời: ${item.answer}`, item.id)
                  }
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-md hover:bg-slate-50 transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép câu trả lời</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
