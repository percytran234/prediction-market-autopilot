# 🤖 AI SHOWCASE — Hành trình build Prediction Market Agent cùng AI

> **Hackathon:** Cook Your MVP 2025  
> **Builder:** Trần Thanh Bình  
> **AI Tools:** Claude Chat (Opus) + Claude Code  
> **Thời gian:** 5 ngày  

---

## Cách đọc tài liệu này

Mỗi section là 1 bước trong quá trình build sản phẩm. Với mỗi bước tôi ghi lại:
- **Tôi làm gì** — quyết định, prompt, câu hỏi
- **AI làm gì** — output, phản biện, đề xuất
- **Tôi học được gì** — kiến thức mới, cách tư duy mới
- **Tiết kiệm bao lâu** — so với tự làm không có AI

---

## 1. Từ ý tưởng mơ hồ → Spec hoàn chỉnh trong 30 phút

<img width="819" height="665" alt="image" src="https://github.com/user-attachments/assets/fde197a2-0166-46a1-84d8-a5cefa8a3913" />

**Tôi làm gì:** Bắt đầu với ý tưởng "DeFi Auto-Pilot" rất chung chung. Sau khi Claude viết spec xong, tôi nhận ra hướng đó quá rộng. Tôi nói 1 câu:

> *"Tôi muốn agent trade trên prediction market, tập trung vào BTC 15 phút trên Polymarket. Làm sao để users dù không biết gì vẫn từ hòa đến win?"*

**AI làm gì:** Không chỉ đổi tên — Claude redesign toàn bộ strategy: fixed fraction betting 2%, skip khi signal yếu, hard stop-loss -10%/ngày. Kèm mô hình toán học chứng minh tại sao strategy hoạt động.

**Tôi học được gì:**
- Cách viết spec cho product: User → Problem → Solution → Scope → Tech Stack
- Fixed fraction betting (2% bankroll/round) — concept tôi chưa biết trước đó
- "Skip là vũ khí mạnh nhất" — không bet = không thua. Tôi áp dụng tư duy này vào cả việc ra quyết định ngoài trading

**⏱️ Tiết kiệm:** ~2 ngày research + viết spec thủ công

---

## 2. AI tự phản biện — dạy tôi cách nghĩ phản biện

<img width="821" height="760" alt="image" src="https://github.com/user-attachments/assets/c19e6ec6-e89f-4a4b-a66d-94980fe4c164" />

**Tôi làm gì:** Không hỏi gì thêm — chỉ đọc output.

**AI làm gì:** Claude tự nhận ra vấn đề trong chính spec nó viết:
- v1→v2: *"Win rate 55% là giả thuyết chưa kiểm chứng"*
- v2→v3: *"Marketing tone nguy hiểm — user có thể hiểu nhầm là guaranteed profit"*
- v3→v4: *"CLOB API phức tạp hơn bạn nghĩ — mock mode phải là plan A"*

**Tôi học được gì:**
- **Cách phản biện chính mình:** Trước khi ship bất cứ thứ gì, hỏi: "Cái này có thể gây hiểu lầm không? Có hứa hẹn quá không?"
- **Honest marketing > Hype marketing:** User sẽ tin tưởng hơn khi bạn nói thẳng giới hạn
- **Mock mode không phải "chưa làm xong" — nó là "responsible engineering":** Không chạy tiền thật khi chưa chứng minh

**⏱️ Tiết kiệm:** Tránh được rủi ro pháp lý + mất niềm tin user (vô giá)

---

## 3. Market research real-time — phát hiện cơ hội mà tôi không biết tồn tại

<img width="814" height="683" alt="image" src="https://github.com/user-attachments/assets/94801b8c-411a-404a-9c01-ceff03c63658" />

**Tôi làm gì:** Hỏi Claude research về hệ sinh thái AI agents trên Polymarket.

**AI làm gì:** Tìm được 3 phát hiện quan trọng:
- **LuckyLobster** ra mắt 2 ngày trước — "first AI Polymarket execution platform"
- **Polymarket CLI** ra mắt hôm qua — official CLI cho AI agents
- **OpenClaw** 300K+ users — viral nhất GitHub

Và nhận ra GAP: *"Tất cả giúp agent trade NHANH. Không ai giúp agent trade ĐÚNG."*

**Tôi học được gì:**
- **Cách tìm positioning:** Đừng cạnh tranh trực tiếp — tìm gap mà đối thủ bỏ qua
- **Timing quan trọng hơn idea:** LuckyLobster vừa launch = market đang HOT = timing hoàn hảo cho mình
- **"Execution layer" vs "Discipline layer":** 2 sản phẩm bổ sung, không cạnh tranh

**⏱️ Tiết kiệm:** ~1 tuần research thủ công (đọc Twitter, Discord, GitHub trending)

---

## 4. Từ market gap → Feature spec hoàn chỉnh trong 1 conversation

<img width="825" height="715" alt="image" src="https://github.com/user-attachments/assets/93de7e15-2004-4351-a211-e9d92948f1ee" />

**Tôi làm gì:** Sau khi biết về OpenClaw + LuckyLobster, tôi hỏi: *"Mình ứng dụng được vào product không?"*

**AI làm gì:** Trong 1 cuộc hội thoại, output:
- Architecture diagram (Agent → Gateway → Discipline Engine → Execute/Skip/Block)
- 4 REST API endpoints + WebSocket design
- Database schema (2 tables)
- OpenClaw Skill plugin (YAML file users cài vào agent)
- Business model 4 tiers ($0 → $199/mo)
- Competitive analysis vs LuckyLobster

**Tôi học được gì:**
- **Cách thiết kế API:** Request → Validation → Processing → Response pattern
- **REST vs WebSocket:** Khi nào dùng cái nào (REST cho request-response, WS cho real-time stream)
- **Platform thinking:** Không chỉ build cho end-user mà build cho developer/agents = multiplier effect
- **"Your agent makes the trades. Our platform keeps it alive."** — 1 câu positioning mà tôi tự hào nhất

**⏱️ Tiết kiệm:** ~3-5 ngày product design + API design

---

## 5. React nhanh với thị trường — Polymarket CLI integration

<img width="800" height="722" alt="image" src="https://github.com/user-attachments/assets/653bc759-8452-44d7-b5b1-68d04675b654" />

**Tôi làm gì:** Thấy Polymarket release CLI trên GitHub, gửi link cho Claude hỏi: *"Cái này mình ứng dụng được không?"*

**AI làm gì:**
1. Đọc toàn bộ README của CLI repo
2. Phân tích 4 tầng ứng dụng cụ thể cho sản phẩm
3. Thiết kế 3 execution modes: Mock → Paper → Live (gate tuần tự)
4. Tạo build prompt ready cho Claude Code

**Tôi học được gì:**
- **Cách wrap external CLI:** Dùng `child_process.execSync` + JSON parse
- **Progressive rollout:** Mock → Paper → Live. User phải "graduate" qua từng bước
- **Rate limiting:** Polymarket có giới hạn API calls. Phải throttle 2s giữa mỗi call
- **Safety by design:** Live mode cần 3 gates. Không có shortcut

**⏱️ Tiết kiệm:** ~2 ngày đọc docs + thiết kế integration

---

## 6. Biến instructions mơ hồ → Build prompts chi tiết cho Claude Code

<img width="816" height="732" alt="image" src="https://github.com/user-attachments/assets/8900cc99-2676-4ed1-b955-52c0bc27ff43" />

**Tôi làm gì:** Nói: "Tôi muốn build thêm features này, tạo prompts cho Claude Code"

**AI làm gì:** Tạo 6 prompts chi tiết, mỗi prompt gồm: Context, What to build, Critical rules, Self-check.

**Tôi học được gì:**
- **Prompt engineering cho code generation:** Càng cụ thể → output càng tốt
- **Self-check pattern:** Luôn kết thúc bằng "Test everything, fix all errors, don't tell me done until zero errors"
- **Dependency order matters:** Build Backtest trước Portfolio vì Portfolio cần data
- **Tách task nhỏ:** 1 prompt = 1 feature. Không gộp nhiều features vào 1 prompt

**⏱️ Tiết kiệm:** ~12-24 giờ viết instructions

---
