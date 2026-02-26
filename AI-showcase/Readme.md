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

https://github.com/percytran234/prediction-market-autopilot/blob/main/AI-showcase/01.png 

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

![Claude tự phản biện spec qua 4 versions](screenshots/02.png)

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

![Phát hiện LuckyLobster và timing thị trường](screenshots/03.png)

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

![AI Agent Gateway spec](screenshots/04.png)

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

![Polymarket CLI integration](screenshots/05.png)

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

## 6. Landing page chuyên nghiệp — 3 iterations, 0 đồng thuê designer

![Landing page v3 với SVG animations](screenshots/06.png)

**Tôi làm gì:** Mô tả concept → review → feedback → iterate. 3 vòng.

**AI làm gì:** Mỗi version upgrade dựa trên feedback. v3 có:
- SVG equity curve với draw-line animation
- Animated bar charts cho signal weights
- Donut chart cho skip rate
- Tất cả scroll-triggered bằng IntersectionObserver

**Tôi học được gì:**
- **SVG animation:** `stroke-dasharray` + `stroke-dashoffset` tạo hiệu ứng vẽ line
- **IntersectionObserver API:** Trigger animation khi element xuất hiện trong viewport
- **Scroll-driven storytelling:** Mỗi section kể 1 phần câu chuyện khi user scroll
- **"Show, don't tell":** Thay vì viết "equity curve", VẼ equity curve bằng SVG

**⏱️ Tiết kiệm:** ~$2,000-5,000 thuê designer + ~1 tuần development

---

## 7. Biến instructions mơ hồ → Build prompts chi tiết cho Claude Code

![6 Claude Code prompts](screenshots/07.png)

**Tôi làm gì:** Nói: "Tôi muốn build thêm features này, tạo prompts cho Claude Code"

**AI làm gì:** Tạo 6 prompts chi tiết, mỗi prompt gồm: Context, What to build, Critical rules, Self-check.

**Tôi học được gì:**
- **Prompt engineering cho code generation:** Càng cụ thể → output càng tốt
- **Self-check pattern:** Luôn kết thúc bằng "Test everything, fix all errors, don't tell me done until zero errors"
- **Dependency order matters:** Build Backtest trước Portfolio vì Portfolio cần data
- **Tách task nhỏ:** 1 prompt = 1 feature. Không gộp nhiều features vào 1 prompt

**⏱️ Tiết kiệm:** ~12-24 giờ viết instructions

---

## 8. Giải quyết vấn đề "không nói được" — Presentation kit hoàn chỉnh

![Presentation kit cho người không nói](screenshots/08.png)

**Tôi làm gì:** Bị bệnh, không nói được. Nói: *"Tôi không thể nói được do bệnh, cần chuẩn bị để trình bày"*

**AI làm gì:** Tạo 3 files:
1. **15-slide HTML deck** — BGK tự đọc, điều hướng bằng phím
2. **Q&A Cheatsheet** — 30+ câu trả lời, Ctrl+F → copy → paste
3. **Demo Script** — từng bước click đâu, show gì, bao lâu

**Tôi học được gì:**
- **Adapt, don't give up:** Không nói được ≠ không present được
- **Pre-written Q&A saves lives:** Soạn sẵn = professional khi stress cao
- **Backup plan luôn:** Screenshot mọi page phòng demo lỗi mạng

**⏱️ Tiết kiệm:** Biến tình huống bất lợi → presentation vẫn chuyên nghiệp (vô giá)

---

## 9. Business thinking — Từ "cool project" thành "viable product"

![Business strategy](screenshots/09.png)

**Tôi làm gì:** Hỏi Claude giúp chuẩn bị cho judges — pricing, unit economics, competitive analysis.

**AI làm gì:** Phân tích market size, thiết kế pricing, tính unit economics (98% gross margin), chuẩn bị 12 câu Q&A, honest risk assessment.

**Tôi học được gì:**
- **Performance fee = incentive alignment:** Thu tiền khi user có lời → platform có động lực
- **Unit economics:** Software margin gần 100% — 10K users chỉ tốn $200/mo server
- **Honesty wins:** Nói thẳng "chưa chứng minh win rate" tốt hơn giả vờ có data
- **"Nếu thua, bạn mất $10. Nếu không có discipline, bạn mất $100."**

**⏱️ Tiết kiệm:** ~$5,000-10,000 consulting fee

---

## 10. Automated QA — Test toàn bộ app trong 5 phút

![Health check automated](screenshots/10.png)

**Tôi làm gì:** Paste: "Do a full health check. Test every page, every API endpoint, fix all errors."

**AI làm gì:** Test 8 pages (tất cả 200), 12 API endpoints (tất cả valid JSON), production build (zero errors), seed data (20 bets populated). Report: "Issues Found: None"

**Tôi học được gì:**
- **Automated testing mindset:** Đừng test bằng mắt — viết script test
- **curl là bạn:** `curl -s localhost:3001/api/health | jq` nhanh hơn mở browser
- **Build trước khi ship:** `npm run build` catch lỗi mà dev server bỏ qua
- **Seed data quan trọng:** Page trống = demo fail

**⏱️ Tiết kiệm:** ~2-3 giờ manual QA → 5 phút

---

## 📊 Tổng kết

### Thời gian tiết kiệm

| Task | Tự làm | Với AI | Tiết kiệm |
|------|--------|--------|-----------|
| Spec design (4 versions) | 3-4 ngày | 2 giờ | ~3 ngày |
| Market research | 1 tuần | 30 phút | ~6 ngày |
| API + Database design | 3-5 ngày | 1 giờ | ~4 ngày |
| Landing page (3 versions) | 1-2 tuần | 3 giờ | ~10 ngày |
| Build prompts (6 features) | 12-24 giờ | 2 giờ | ~15 giờ |
| Business strategy | 3-5 ngày | 1 giờ | ~4 ngày |
| QA testing | 2-3 giờ | 5 phút | ~2.5 giờ |
| Presentation kit | 1-2 ngày | 1 giờ | ~1.5 ngày |
| **TỔNG** | **~4-5 tuần** | **~5 ngày** | **~3-4 tuần** |

### Bài học lớn nhất

> **AI không thay thế tôi. AI amplify tôi.**
>
> Tôi vẫn phải: chọn hướng đi, ra quyết định pivot, phát hiện cơ hội (Polymarket CLI), và biết khi nào nên dừng.
>
> AI giúp tôi: execute nhanh hơn 5-10x, phản biện ý tưởng, research market trong phút thay vì ngày, và biến 1 người thành 1 team.

---

## 📁 Cách thêm ảnh

1. Tạo folder `screenshots/` trong repo
2. Chụp screenshot từng phần tương ứng
3. Đặt tên file đúng số: `01.png`, `02.png`, ... `10.png`
4. Push lên GitHub → ảnh tự hiện trong README

```
screenshots/
├── 01.png  ← Spec pivot (DeFi → Prediction Market)
├── 02.png  ← Claude tự phản biện 4 versions
├── 03.png  ← Market research (LuckyLobster discovery)
├── 04.png  ← Agent Gateway spec
├── 05.png  ← Polymarket CLI integration
├── 06.png  ← Landing page v3
├── 07.png  ← Build prompts
├── 08.png  ← Presentation kit
├── 09.png  ← Business strategy
└── 10.png  ← Health check
```

---

*Cook Your MVP Hackathon 2025 — Built with Claude AI*
