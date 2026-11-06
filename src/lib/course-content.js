const DETAILS = {
  KID: {
    audience:
      "Trẻ từ 6–11 tuổi làm quen với tiếng Anh qua hoạt động phù hợp lứa tuổi.",
    topics: [
      "Từ vựng qua các chủ đề quen thuộc",
      "Nghe và nói qua trò chơi, bài hát",
      "Thực hành cùng các dự án nhỏ",
    ],
    entry: "Phụ huynh trao đổi độ tuổi, khả năng nghe hiểu và mức độ làm quen với tiếng Anh để chọn lớp phù hợp cho trẻ.",
    objectives: ["Nhận biết và sử dụng từ vựng quen thuộc", "Tập nghe hướng dẫn ngắn và trả lời bằng câu đơn giản", "Tự giới thiệu và nói về sở thích"],
    outline: [
      ["Làm quen với âm và từ", "Quan sát đồ vật, gọi tên màu sắc và lắng nghe các câu ngắn."],
      ["Nghe, hỏi và trả lời", "Thực hành lời chào, giới thiệu bản thân và các mẫu hỏi đáp quen thuộc."],
      ["Kể câu chuyện của mình", "Kết nối từ đã học thành đoạn giới thiệu hoặc một dự án nhỏ."],
    ],
    activity: {
      title: "Gọi tên màu sắc",
      prompt: "What color is a banana?",
      options: ["Yellow", "Purple", "Blue"],
      answer: 0,
      explanation: "A ripe banana is yellow. Một quả chuối chín thường có màu vàng.",
      extension: "Nhìn quanh phòng và nói bằng tiếng Anh tên màu của ba đồ vật.",
    },
  },
  A1: {
    audience: "Người mới bắt đầu hoặc muốn học lại nền tảng tiếng Anh.",
    topics: [
      "Xây nền phát âm",
      "Từ vựng và mẫu câu cơ bản",
      "Giao tiếp trong các tình huống hằng ngày",
    ],
    entry: "Phù hợp để bắt đầu lại nền tảng; bạn có thể làm bài thử ngắn và trao đổi thêm với tư vấn viên trước khi chọn lớp.",
    objectives: ["Tự giới thiệu bằng những câu ngắn", "Hỏi và trả lời thông tin cá nhân cơ bản", "Dùng các mẫu câu trong tình huống hằng ngày"],
    outline: [
      ["Xây nền phát âm và mẫu câu", "Làm quen với âm, trọng âm từ và cách tạo một câu đơn giản."],
      ["Giao tiếp hằng ngày", "Luyện tình huống chào hỏi, mua sắm, hỏi giờ và hỏi đường."],
      ["Ghép câu thành hội thoại", "Kết nối thông tin cá nhân, thói quen và sở thích thành một cuộc trao đổi ngắn."],
    ],
    activity: {
      title: "Giới thiệu bản thân",
      prompt: "Choose the correct sentence to introduce yourself.",
      options: ["My name is Linh.", "My name are Linh.", "My names is Linh."],
      answer: 0,
      explanation: "Dùng “My name is …” để giới thiệu tên. “Name” là danh từ số ít nên đi với “is”.",
      extension: "Viết ba câu giới thiệu tên, nơi sống và sở thích của bạn.",
    },
  },
  A2: {
    audience:
      "Người đã có nền tảng cơ bản và muốn sử dụng tiếng Anh thường xuyên hơn.",
    topics: [
      "Giao tiếp trong công việc",
      "Tình huống khi đi du lịch",
      "Diễn đạt về đời sống hằng ngày",
    ],
    entry: "Nên có khả năng giới thiệu bản thân và hiểu các câu giao tiếp đơn giản; kết quả bài thử chỉ là cơ sở trao đổi ban đầu.",
    objectives: ["Trao đổi về công việc và sinh hoạt", "Xử lý các tình huống du lịch quen thuộc", "Mô tả một trải nghiệm bằng các câu liên kết"],
    outline: [
      ["Củng cố câu giao tiếp", "Ôn cách hỏi đáp, diễn đạt thời gian và mô tả các thói quen."],
      ["Ứng dụng vào tình huống", "Thực hành đặt phòng, gọi món và trao đổi thông tin công việc."],
      ["Kể và nối ý", "Nói về trải nghiệm, kế hoạch và so sánh những lựa chọn quen thuộc."],
    ],
    activity: {
      title: "Đặt phòng khách sạn",
      prompt: "Which sentence is the most suitable way to ask for a room?",
      options: ["I room tomorrow.", "I'd like to book a room for two nights.", "Room is two nights me."],
      answer: 1,
      explanation: "“I'd like to book …” là cách lịch sự để nói bạn muốn đặt một dịch vụ. “For two nights” cho biết thời gian lưu trú.",
      extension: "Thay đổi số đêm và thêm một câu hỏi về giá phòng.",
    },
  },
  B1: {
    audience:
      "Người muốn phát triển đồng đều các kỹ năng và chuẩn bị nền tảng cho chứng chỉ.",
    topics: [
      "Thực hành nghe và đọc",
      "Phát triển nói và viết",
      "Củng cố nền tảng cho chứng chỉ quốc tế",
    ],
    entry: "Dành cho người đã giao tiếp được về chủ đề quen thuộc và muốn diễn đạt ý dài hơn; trao đổi trình độ thực tế khi tư vấn.",
    objectives: ["Nắm ý chính của nội dung về chủ đề quen thuộc", "Trình bày quan điểm cùng lý do và ví dụ", "Viết đoạn văn có mở ý và liên kết"],
    outline: [
      ["Mở rộng cách diễn đạt", "Tập nhận diện ý chính, từ khóa và các cách diễn đạt trong ngữ cảnh."],
      ["Phát triển bốn kỹ năng", "Kết hợp đọc, nghe với hoạt động nói và viết theo từng chủ đề."],
      ["Trình bày ý có cấu trúc", "Sắp xếp quan điểm, lý do và ví dụ trong đoạn nói hoặc đoạn viết."],
    ],
    activity: {
      title: "Nối ý tương phản",
      prompt: "Complete the sentence: The course was challenging. ___, I enjoyed it.",
      options: ["Because", "However", "For example"],
      answer: 1,
      explanation: "“However” nối hai ý tương phản: khóa học có thử thách nhưng người nói vẫn thích nó.",
      extension: "Viết hai câu về việc học và nối hai ý tương phản bằng “however”.",
    },
  },
  B2: {
    audience:
      "Người muốn nâng khả năng trình bày, thảo luận và viết tiếng Anh.",
    topics: [
      "Thảo luận và trình bày quan điểm",
      "Thuyết trình bằng tiếng Anh",
      "Làm quen với viết học thuật",
    ],
    entry: "Phù hợp với người đã có thể trao đổi và viết đoạn văn về chủ đề quen thuộc; cần trao đổi thêm về khả năng nghe, nói và viết.",
    objectives: ["Phát triển lập luận có dẫn chứng", "Thảo luận nhiều góc nhìn của một vấn đề", "Chỉnh sửa bài viết cho rõ ý và mạch lạc"],
    outline: [
      ["Mở rộng ngôn ngữ theo chủ đề", "Khai thác nội dung nghe đọc, nhận diện thái độ và cách tổ chức lập luận."],
      ["Thảo luận và thuyết trình", "Thực hành giải thích quan điểm, phản hồi câu hỏi và cân nhắc ý kiến khác."],
      ["Viết và tự chỉnh sửa", "Lập dàn ý, phát triển dẫn chứng và kiểm tra tính liên kết của bài viết."],
    ],
    activity: {
      title: "Chọn luận điểm có căn cứ",
      prompt: "Which sentence best supports an argument about flexible study schedules?",
      options: ["Flexible schedules are nice.", "Everyone always learns better at home.", "Flexible schedules allow working learners to attend classes without leaving their jobs."],
      answer: 2,
      explanation: "Đáp án nêu một lợi ích cụ thể và giải thích đối tượng được hưởng lợi. Hai câu còn lại quá chung hoặc khẳng định tuyệt đối.",
      extension: "Bổ sung một hạn chế của lịch học linh hoạt và đề xuất cách khắc phục.",
    },
  },
  IELTS: {
    audience: "Người muốn chuẩn bị nền tảng IELTS và cần định hướng luyện thi.",
    topics: [
      "Làm quen cấu trúc bài thi IELTS",
      "Luyện tập các kỹ năng theo chương trình",
      "Học cùng phản hồi và chấm chữa của giáo viên",
    ],
    entry: "Bạn nên trao đổi nền tảng tiếng Anh, mục tiêu và thời điểm dự thi; tên khóa không thay thế đánh giá trình độ hay cam kết điểm thi.",
    objectives: ["Làm quen dạng nhiệm vụ của bốn kỹ năng", "Nhận diện ý chính và thông tin cần tìm", "Tổ chức câu trả lời và tự xem lại lỗi thường gặp"],
    outline: [
      ["Hiểu cấu trúc và yêu cầu", "Nhận diện nhiệm vụ nghe, đọc, viết và nói qua các bài luyện tập minh họa."],
      ["Rèn kỹ năng làm bài", "Tập đọc câu hỏi, chọn từ khóa, sắp xếp ý và phân bổ thời gian luyện tập."],
      ["Luyện tập và xem lại", "Đối chiếu câu trả lời với giải thích, ghi lại lỗi và luyện lại phần còn yếu."],
    ],
    activity: {
      title: "Đọc và tìm thông tin",
      prompt: "Read: “The library opens at 8 a.m. on weekdays and at 9 a.m. on Saturdays.” What time does it open on Saturday?",
      options: ["8 a.m.", "9 a.m.", "10 a.m."],
      answer: 1,
      explanation: "Thông tin “at 9 a.m. on Saturdays” trả lời trực tiếp câu hỏi. Cần phân biệt ngày trong tuần với thứ Bảy.",
      extension: "Gạch chân từ khóa trong câu hỏi rồi viết lại câu trả lời đầy đủ bằng tiếng Anh.",
    },
  },
};
export function courseContent(course) {
  return Object.hasOwn(DETAILS, course.code)
    ? { ...DETAILS[course.code], samplePath: `/materials/4english-${course.code.toLowerCase()}-practice.txt` }
    : {
      audience:
        "Người học được tư vấn theo trình độ, mục tiêu và thời gian thực tế.",
      topics: [course.desc || "Thông tin chương trình đang được cập nhật."],
      entry: "Liên hệ tư vấn để xác nhận điều kiện đầu vào của chương trình này.",
      objectives: [],
      outline: [],
      activity: null,
      samplePath: "",
    };
}

// Derive duration from the class schedule rather than assuming all classes match.
export function classDurationMinutes(klass) {
  const pattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!pattern.test(klass?.start || "") || !pattern.test(klass?.end || "")) return null;
  const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const duration = minutes(klass.end) - minutes(klass.start);
  return duration > 0 ? duration : null;
}
