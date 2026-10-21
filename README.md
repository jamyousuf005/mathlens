# MathLens: Software Requirements Specification

Photo, Camera and Handwriting Math Solver. Version 1.0, Hackathon Edition. 20 October 2026.

## 1. Introduction

### 1.1 Purpose

This document defines what MathLens must do, how it is structured, what data it stores, and how we will prove it works. It is the single reference for building, testing and demoing the project.

### 1.2 Product Summary

MathLens is a web application where a user gives it a math problem in one of three ways: uploading a photo, capturing a photo with the device camera, or writing on an on-screen writing pad. The system recognizes the problem, shows the recognized expression for confirmation, solves it with our own deterministic math engine, and displays the answer with step-by-step working.

### 1.3 Hard Constraints

- No paid services and no AI APIs (OpenAI, Gemini, Mathpix, WolframAlpha and similar).
- Stack limited to Next.js, TypeScript, Node.js and free open-source web packages.
- All solving is done by our own deterministic code (normalizer, lexer, parser, classifier, solver, step generator). No model decides an answer.
- Free open-source libraries that run locally in the browser (Tesseract.js, TensorFlow.js) are used only to read symbols from an image or handwriting. They cost nothing and call no external service. We state this openly to the judges.

### 1.4 Core Design Principle: Recognition and Solving Are Separate

Reading handwriting from a picture can never be 100% accurate in any software, including paid products. Solving a correctly written expression can be 100% accurate. So the system is split into two halves with a mandatory Confirm step between them:

- Half A (Recognition): image or strokes to an expression string. Accuracy is high but not perfect.
- Confirm step: the user sees the recognized expression rendered as math, and can fix any wrong symbol using an editor and math keyboard in seconds.
- Half B (Compiler and Solver): expression string to verified answer with steps. This half must be perfect and is fully testable.

This is how we deliver 'perfectly working' where it is actually achievable, and we build Half B first.

### 1.5 Scope

In scope:

- Three input methods: file upload, live camera capture, writing pad.
- Image preprocessing, symbol recognition, editable confirmation.
- Math engine covering the tiers in Section 5.
- Step-by-step solutions with LaTeX rendering and answer verification.
- Optional accounts and per-user history (Section 6).

Out of scope:

- Word problems written in natural language ('A train leaves a station...').
- Geometry diagrams, graphs and plots as input.
- Whole-page multi-problem scanning (one problem per submission, though it may span several lines for systems of equations).
- Native mobile apps (responsive web only).

### 1.6 Definitions

| Term | Meaning |
| --- | --- |
| Compiler (in this project) | The pipeline that turns text into an AST, validates it, and evaluates or solves it |
| AST | Abstract Syntax Tree, the structured representation of an expression |
| OCR | Optical Character Recognition, reading text from an image |
| Normalizer | Step that cleans recognized text (for example × to \*, O to 0) |
| Tier | A group of math features released together (Section 5) |
| Confirm step | The screen where the user verifies or edits the recognized expression |

## 2. Overall Description

### 2.1 User Classes

- Guest: uses all solving features with no account. History is kept only on their own device (IndexedDB).
- Registered user: signs in, and history syncs to MongoDB so it is available on any device.

### 2.2 Operating Environment

- Modern browsers: Chrome, Edge, Safari, Firefox (latest two versions).
- Camera requires HTTPS and user permission (getUserMedia).
- Works on phone, tablet and desktop. Writing pad supports mouse, touch and stylus through Pointer Events.
- Server: Node.js 20+ running Next.js route handlers.

### 2.3 Assumptions and Dependencies

- Input is one math problem, printed or neatly handwritten, on a plain background.
- Users will confirm the recognized expression before solving.
- Recognition models are open-source and shipped with the app (no network calls to third parties).

## 3. System Architecture

### 3.1 Processing Pipeline

```
INPUT (upload | camera | pad)
   |
PREPROCESS  grayscale, contrast, binarize, deskew, crop
   |
RECOGNIZE   symbols, layout (powers, fractions, roots) -> expression string
   |
CONFIRM     user sees rendered math, edits if needed
   |
NORMALIZE   clean characters, implicit multiplication
   |
LEX -> PARSE -> AST -> VALIDATE
   |
CLASSIFY    arithmetic | simplify | equation | system | calculus
   |
SOLVE + STEPS + VERIFY
   |
RENDER (KaTeX)  ->  optional SAVE to history
```

### 3.2 Modules and Technology

| Module | Responsibility | Technology |
| --- | --- | --- |
| Web UI | Pages, input panels, result view | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Writing pad | Capture strokes (x, y, time) | HTML canvas, Pointer Events, perfect-freehand (optional) |
| Camera and upload | Capture or load image, crop | getUserMedia, canvas, react-easy-crop |
| Preprocessing | Clean image for recognition | Canvas pixel operations, OpenCV.js (optional) |
| Recognition | Image or strokes to expression | Tesseract.js for printed text; custom TensorFlow.js symbol model for handwriting (Phase 2) |
| Math editor | Edit recognized expression | KaTeX rendering plus on-screen math keyboard |
| Math engine | Normalize, lex, parse, validate, classify, solve, steps, verify | Own TypeScript code, mathjs, nerdamer |
| API layer | Validate requests, run engine, serve history | Next.js route handlers, Zod |
| Auth (optional) | Sign-in | Auth.js (NextAuth) with credentials or free OAuth |
| Database (optional) | User history | MongoDB with Mongoose |
| Testing | Unit, integration, golden tests | Vitest, Playwright (optional) |

The math engine lives in a pure TypeScript package folder with no UI or database imports, so it runs identically in the browser and on the server and can be tested in isolation.

## 4. Functional Requirements

Priority key: M = must have, S = should have, C = could have.

### 4.1 Input Module

- FR-IN-01 (M): The user can upload an image file (JPG, PNG, WebP, up to 10 MB). Invalid type or size shows a clear message.
- FR-IN-02 (M): The user can open the camera, see a live preview, and capture a frame. Rear camera is preferred on phones, with a switch-camera button.
- FR-IN-03 (M): If camera permission is denied or unavailable, the system explains how to fix it and offers upload instead.
- FR-IN-04 (M): The writing pad is a canvas supporting mouse, touch and stylus, with undo, redo, clear and eraser.
- FR-IN-05 (M): The pad records each stroke as an ordered list of points with timestamps so recognition can use stroke data.
- FR-IN-06 (S): After upload or capture, the user can crop to the problem area with an adjustable box and rotate 90 degrees.
- FR-IN-07 (M): A fourth, always-available input is a typed text and math keyboard field. It is the fallback and the main tool for testing the engine.
- FR-IN-08 (C): Drag-and-drop and paste-from-clipboard image support.

### 4.2 Preprocessing

- FR-PP-01 (M): Downscale large images to a maximum side of 1600 px before processing.
- FR-PP-02 (M): Convert to grayscale, then apply contrast normalization.
- FR-PP-03 (M): Binarize using Otsu's method, or adaptive thresholding for uneven lighting.
- FR-PP-04 (S): Detect and correct skew up to about 15 degrees.
- FR-PP-05 (S): Remove small noise specks and auto-trim blank margins.
- FR-PP-06 (M): Preprocessing runs in a Web Worker so the UI never freezes.

### 4.3 Recognition

- FR-RC-01 (M): Printed single-line expressions are recognized with Tesseract.js configured with a restricted character whitelist (digits, operators, brackets, x, y, z, equals, decimal point).
- FR-RC-02 (M): Writing pad input is converted to an image and sent through the same recognizer in the first release. The stroke data is kept for the Phase 2 handwriting model.
- FR-RC-03 (S): Handwriting model: segment the image into symbols (connected components or stroke grouping), classify each with a small TensorFlow.js model trained offline on free datasets (such as HASYv2 or CROHME symbol data), then rebuild layout from symbol positions.
- FR-RC-04 (S): Layout analysis detects superscripts (powers), fraction bars with numerator above and denominator below, and square root signs.
- FR-RC-05 (M): Recognition returns the expression string plus a confidence value per symbol where available.
- FR-RC-06 (M): Models and workers load lazily, with a visible progress indicator on first use.
- FR-RC-07 (M): All recognition runs in the browser. No image leaves the device unless the user is signed in and chooses to save a thumbnail.

### 4.4 Confirm and Edit Step

- FR-CE-01 (M): After recognition, show the original image (or pad drawing) beside the recognized expression rendered with KaTeX.
- FR-CE-02 (M): The expression is editable as text, with a math keyboard (digits, operators, fractions, powers, roots, brackets, x, y, pi, trig functions).
- FR-CE-03 (M): Low-confidence symbols are visually highlighted so the user knows where to look.
- FR-CE-04 (M): A live parse check shows 'Valid expression' or a specific error as the user edits.
- FR-CE-05 (M): A Solve button is enabled only when the expression parses successfully.
- FR-CE-06 (S): The system records the difference between recognized and corrected text (used as optional feedback data, see Section 6).

### 4.5 Math Engine (the Compiler)

This is the heart of the project and must be exact.

- FR-ME-01 (M): Normalizer. Maps common recognition and typing variants to canonical form:
  - × and x between numbers to \*, ÷ to /, long dashes and minus signs to -.
  - Letter O to 0 and l or I to 1 when between digits.
  - √ to sqrt(, π to pi, superscript marks to ^.
  - Inserts implicit multiplication: 2x to 2*x, 2(x+1) to 2*(x+1), (a)(b) to (a)\*(b), x(y) handled by rule.
- FR-ME-02 (M): Lexer. Produces tokens: NUMBER, IDENTIFIER, FUNCTION, OPERATOR, LPAREN, RPAREN, EQUALS, COMPARATOR, COMMA, EOF. Reports the position of any illegal character.
- FR-ME-03 (M): Parser. Recursive-descent or Pratt parser building an AST with correct precedence and associativity: parentheses, unary minus, exponent (right-associative), multiply and divide, add and subtract, equals and inequalities.
- FR-ME-04 (M): Validator. Checks balanced brackets, dangling operators, empty groups, unknown identifiers, more than one equals sign per equation, and literal division by zero. Errors carry a human-readable message and a character position.
- FR-ME-05 (M): Classifier. Decides the problem type from the AST:
  - Pure arithmetic (no variables)
  - Expression with variables (simplify, expand, factor)
  - Single-variable equation (linear, quadratic, higher polynomial)
  - System of equations (lines separated by newline, comma or semicolon)
  - Inequality
  - Calculus (derivative, definite and indefinite integral, limit), Tier 3
- FR-ME-06 (M): Arithmetic solver. Evaluates with exact fractions where possible (no floating point surprises such as 0.1 + 0.2). Returns an exact form and a decimal approximation.
- FR-ME-07 (M): Equation solver. Linear and quadratic equations use our own step-producing implementations (including discriminant and the quadratic formula). Higher-degree and system cases may use nerdamer for the answer, and steps are generated from our rule set where available.
- FR-ME-08 (M): Step generator. Each step is a record with: description, expression before, expression after, rule name. Arithmetic steps follow order of operations, one rewrite at a time.
- FR-ME-09 (M): Verifier. Every solved equation is checked by substituting the answer back into the original equation (exact where possible, numeric tolerance 1e-9 otherwise). The result shows 'Verified' or flags a mismatch instead of silently returning a wrong answer.
- FR-ME-10 (M): LaTeX printer. Converts the AST and results to LaTeX for display.
- FR-ME-11 (M): Safety. The engine never uses eval or the Function constructor. Execution time is capped (default 3 seconds) and expression length is capped (default 300 characters).
- FR-ME-12 (S): Edge cases handled with explicit messages: no solution, infinitely many solutions, complex roots (shown as a plus or minus i form), undefined results.

### 4.5 Solution Output

- FR-OU-01 (M): Show the final answer prominently, with exact and decimal forms when they differ.
- FR-OU-02 (M): Show numbered steps, each with a short description and rendered math.
- FR-OU-03 (M): Show the verification line.
- FR-OU-04 (M): Show the problem type detected (for example 'Quadratic equation in x').
- FR-OU-05 (S): Copy answer, copy LaTeX, and share link buttons.
- FR-OU-06 (S): Collapse and expand steps.
- FR-OU-07 (C): Plot the graph of a single-variable expression or equation using a free charting library.

### 4.7 History and Accounts (Optional Layer)

- FR-HI-01 (S): Guests get local history in IndexedDB with no sign-in.
- FR-HI-02 (S): Registered users get history stored in MongoDB, listed newest first with search and filter by input type.
- FR-HI-03 (S): Opening a history item restores the expression, steps and answer without recomputing from an image.
- FR-HI-04 (S): Users can delete a single item or their entire history, and delete their account.
- FR-HI-05 (C): Favorite or star a problem.

### 4.8 Error Handling

- FR-ER-01 (M): Recognition failure (empty or unreadable image) shows a retake or rewrite suggestion and keeps the manual editor available.
- FR-ER-02 (M): Parse errors point to the exact problem position in the expression.
- FR-ER-03 (M): Unsupported problem types show a clear 'not supported yet' message listing what is supported.
- FR-ER-04 (M): API failures never crash the page. The user sees a retry option.

## 5. Supported Math Scope

Build and fully test one tier before starting the next.

**Tier 1: Must work perfectly (core of the demo)**

- Arithmetic with + - \* / ^, brackets, decimals, fractions, percentages, order of operations.
- Square roots, absolute value, factorial.
- Linear equations in one variable: 3x + 5 = 20.
- Quadratic equations: x^2 - 5x + 6 = 0, with real and complex roots.
- Simplify and expand expressions: (x+2)(x+3).
- Systems of two linear equations in two variables.

**Tier 2: Should work**

- Factoring polynomials.
- Trigonometric values and basic identities evaluation (sin, cos, tan with degrees or radians).
- Logarithms and exponentials.
- Inequalities in one variable.
- Systems of three linear equations.

**Tier 3: Stretch goals**

- Derivatives (power, product, chain rules) with steps.
- Indefinite and definite integrals of polynomials and basic functions.
- Limits of simple expressions.
- Matrices (determinant, inverse).

## 6. Data Requirements: Do We Need a Database?

### 6.1 Direct Answer

The core functionality does not need a database at all. Recognizing and solving a problem is stateless: input goes in, answer comes out, and nothing has to be remembered. The first working version should have no database.

A database is needed only for features that are about the user rather than the math:

- Showing a signed-in user their own past problems (history), on any device.
- Reopening a past solution instantly without recomputing.
- Favorites or notes on a problem.
- Collecting recognition corrections to improve the handwriting model later.

These are 'should have' features. They make the project feel like a complete product for judges, but the project passes or fails on the engine.

### 6.2 Recommended Approach

1. Build and finish the core with no database.
2. Add guest history in the browser (IndexedDB) so history works with zero backend.
3. Add MongoDB and sign-in last, if time allows.

### 6.3 What Is Stored (MongoDB)

Collection: users

| Field | Type | Note |
| --- | --- | --- |
| \_id | ObjectId |  |
| name | string |  |
| email | string, unique |  |
| passwordHash | string | Only for credentials login; bcrypt. Omitted for OAuth |
| createdAt | Date |  |

Collection: problems

| Field | Type | Note |
| --- | --- | --- |
| \_id | ObjectId |  |
| userId | ObjectId, indexed | Owner. Every query filters by this |
| inputType | enum: upload, camera, pad, typed |  |
| recognizedText | string | What the recognizer produced |
| finalExpression | string | What the user confirmed and we solved |
| latex | string | For display |
| problemType | string | For example quadratic, linear-system |
| answer | object | Exact form, decimal form, verified flag |
| steps | array | Step records from the step generator |
| strokes | array, optional | Pad stroke data (compact), lets the user reopen the drawing |
| thumbnail | string, optional | Small compressed image, 30 KB cap, only if the user opts in |
| corrected | boolean | True if user edited the recognized text |
| favorite | boolean |  |
| createdAt | Date, indexed | History is sorted by this |

Indexes: (userId, createdAt descending) and a text index on finalExpression for search.

### 6.4 What Is Not Stored

- Full-resolution uploaded or captured images (privacy and storage cost). Images are processed in the browser and discarded.
- Raw passwords (only salted hashes).
- Any third-party tracking data.

### 6.5 Retention and Privacy

- Users can delete any problem or all history, and delete their account, which removes all linked documents.
- Guest history never leaves the device.

## 7. API Specification

All endpoints are Next.js route handlers. Inputs are validated with Zod. All responses are JSON.

| Method and path | Purpose | Auth |
| --- | --- | --- |
| POST /api/parse | Validate an expression, return AST summary, problem type, or error with position | None |
| POST /api/solve | Solve a confirmed expression, return answer, steps, verification, LaTeX | None |
| GET /api/history | List the user's problems (paginated, searchable) | Required |
| POST /api/history | Save a solved problem | Required |
| GET /api/history/:id | Fetch one problem | Required |
| DELETE /api/history/:id | Delete one problem | Required |
| DELETE /api/history | Delete all of the user's problems | Required |
| /api/auth/\* | Sign-in, sign-out, session (Auth.js) | None |

Solve request:

```json
{ "expression": "x^2 - 5x + 6 = 0", "angleMode": "radians" }
```

Solve response:

```json
{
  "ok": true,
  "problemType": "quadratic-equation",
  "variable": "x",
  "answer": { "exact": ["2", "3"], "decimal": [2, 3], "verified": true },
  "steps": [
    { "rule": "identify-coefficients", "description": "a = 1, b = -5, c = 6", "before": "x^2 - 5x + 6 = 0", "after": "a=1, b=-5, c=6" }
  ],
  "latex": "x^2 - 5x + 6 = 0"
}
```

Error response:

```json
{ "ok": false, "error": { "code": "PARSE_ERROR", "message": "Missing closing bracket", "position": 7 } }
```

Rate limiting: 60 requests per minute per IP on solve and parse, using a simple in-memory limiter for the hackathon.

## 8. User Interface Requirements

- UI-01: Home page with four clear tabs: Upload, Camera, Write, Type.
- UI-02: A three-stage flow visible at all times: Input, Confirm, Solution.
- UI-03: The Confirm screen shows image and rendered math side by side on desktop, stacked on mobile.
- UI-04: Solution screen leads with the answer, then steps, then verification.
- UI-05: Mobile-first layout, buttons at least 44 px tall, camera button reachable by thumb.
- UI-06: Light and dark mode.
- UI-07: Loading states for model download and for solving. No blank screens.
- UI-08: Accessible: keyboard navigation on all controls, labels for icon buttons, sufficient contrast.
- UI-09: History page (if built) with search and per-item delete.

## 9. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-01 Performance | Parse plus solve of a Tier 1 problem returns in under 500 ms on the server. Typed-to-answer feels instant |
| NFR-02 Recognition speed | A clean printed single-line image is recognized within 5 seconds on a mid-range phone after models are loaded |
| NFR-03 Correctness | The engine passes 100% of the Tier 1 golden test set (Section 11) |
| NFR-04 Reliability | No unhandled exception reaches the user. Every failure has a message and a next action |
| NFR-05 Security | No eval. Input length and time caps. Zod validation on every endpoint. Hashed passwords. Auth checks on every history endpoint. HTTPS only |
| NFR-06 Privacy | Images are processed client-side by default. No third-party analytics sending user content |
| NFR-07 Maintainability | TypeScript strict mode, engine isolated in its own folder, one responsibility per file |
| NFR-08 Portability | Engine runs in both Node and browser without changes |
| NFR-09 Cost | Zero paid services. Deployable on a free hosting tier and a free MongoDB tier |

## 10. Risks and Honest Limits

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| OCR misreads handwriting or fractions | High | Mandatory Confirm step with editor and math keyboard. Highlight low-confidence symbols. Build the engine first so recognition errors are the only variable |
| Tesseract is weak on math layout (fractions, powers, stacked equations) | High | Whitelist characters, single-line focus in Tier 1, custom symbol model plus layout analysis in Phase 2 |
| Training a handwriting model takes too long for the hackathon | Medium | Treat it as a stretch. Ship Tesseract path and pad-to-image path first. Train offline once, ship the model file |
| Step-by-step explanations for advanced topics are time-consuming | Medium | Own step generators only for Tier 1. For Tier 2 and 3 show the answer with fewer steps and label them clearly |
| Poor lighting or blurry phone photos | Medium | Preprocessing, crop tool, tips shown at capture ('hold steady, good light, one problem') |
| Scope creep | High | Tier system. Nothing from Tier 2 starts until Tier 1 passes all tests |
| Wrong answer shown with confidence | Low impact if mitigated | Verification step on every equation. Show 'could not verify' instead of guessing |

Stating these limits openly in the demo is a strength. Judges trust a team that knows where its system is and is not reliable.

## 11. Testing and Acceptance Criteria

### 11.1 Test Layers

- Unit tests (Vitest): normalizer, lexer, parser, validator, each solver, step generator, LaTeX printer.
- Golden test set: a JSON file of at least 200 problems with known correct answers, covering every Tier 1 type. Includes tricky cases: negative exponents, nested brackets, 0.1 + 0.2, repeated roots, complex roots, no-solution and infinite-solution systems.
- Property checks: for every solved equation, substituting the answer must satisfy it.
- Recognition benchmark: 50 printed and 50 handwritten sample images with ground-truth text, used to measure symbol accuracy.
- End-to-end (Playwright, optional): upload sample image, confirm, solve, see answer.

### 11.2 Acceptance Criteria

| ID | Criterion | Target |
| --- | --- | --- |
| AC-01 | Engine correctness on Tier 1 golden set | 100% |
| AC-02 | Parse errors report a position | 100% of invalid inputs |
| AC-03 | Recognition accuracy, clean printed single-line | At least 90% of images exact after normalization |
| AC-04 | Recognition accuracy, neat handwriting | At least 75% exact, remainder fixable in the editor in under 20 seconds |
| AC-05 | Camera, upload, pad and typed all reach the Solve screen | Works on Chrome desktop and Chrome Android at minimum |
| AC-06 | Every solved equation shows verification | 100% |
| AC-07 | No crashes on 100 random malformed inputs | 0 unhandled errors |
| AC-08 | Zero paid or external AI calls | Confirmed by network tab during demo |

## 12. Development Plan

### 12.1 Build Order

The order is deliberate: build the part that can be perfect first, and the unreliable part last.

| Phase | Work | Outcome |
| --- | --- | --- |
| 0. Setup | Next.js with TypeScript strict, Tailwind, Vitest, ESLint, folder structure, repository | Clean project that runs and tests |
| 1. Math engine core | Normalizer, lexer, parser, AST, validator, arithmetic evaluator, LaTeX printer, with tests | Typed expressions evaluate perfectly |
| 2. Equation solving | Classifier, linear, quadratic, system solvers, step generator, verifier, golden test set | All of Tier 1 passes 100% |
| 3. Text-to-answer UI | Type tab, math keyboard, KaTeX output, solve and parse API routes | A fully working product with no image input yet. This is your safety net for the demo |
| 4. Writing pad | Canvas with strokes, undo and clear, export to image, Confirm screen | Pad input reaches the solver |
| 5. Upload and camera | Capture, crop, preprocessing worker, Tesseract.js, Confirm screen | Photo input reaches the solver |
| 6. History | IndexedDB guest history, then Auth.js and MongoDB if time allows | Per-user history |
| 7. Handwriting model (stretch) | Symbol dataset, offline training, TF.js model, layout analysis | Better handwriting accuracy |
| 8. Polish and demo | Error states, mobile pass, dark mode, demo script, README | Submission ready |

If time is short, drop Phase 7 first, then the MongoDB half of Phase 6. Phases 0 to 5 are the project.

### 12.2 Suggested Folder Structure

```
src/
  app/
    page.tsx                  home with input tabs
    solve/page.tsx            confirm and solution flow
    history/page.tsx          optional
    api/
      parse/route.ts
      solve/route.ts
      history/route.ts
      auth/[...nextauth]/route.ts
  components/
    input/  UploadPanel, CameraPanel, WritingPad, TypePanel
    confirm/  ExpressionEditor, MathKeyboard
    solution/ AnswerCard, StepsList
  lib/
    engine/                   pure TypeScript, no UI imports
      normalize.ts
      lexer.ts
      parser.ts
      ast.ts
      validate.ts
      classify.ts
      solvers/ arithmetic.ts linear.ts quadratic.ts system.ts
      steps.ts
      verify.ts
      latex.ts
    recognition/
      preprocess.worker.ts
      ocr.ts
      symbolModel.ts          phase 7
    db/ mongoose.ts models/
  tests/
    golden/tier1.json
    engine/*.test.ts
```

### 12.3 Key Libraries

- Math: mathjs (evaluation, fractions, big numbers), nerdamer (symbolic solving).
- Rendering: KaTeX.
- Recognition: tesseract.js, @tensorflow/tfjs (Phase 7), optional opencv.js.
- UI: Tailwind CSS, react-easy-crop, react-signature-canvas or a custom canvas.
- Backend: zod, mongoose, next-auth (Auth.js), bcryptjs.
- Testing: vitest, playwright.

## 13. Hackathon Demo Plan

1. Start with the problem and the constraint: no AI APIs, no paid tools, everything built from first principles.
2. Type a nested arithmetic expression and show the step-by-step order of operations.
3. Write a quadratic equation on the pad, show the Confirm screen, fix one symbol live, solve with discriminant steps and verification.
4. Capture a printed equation with the phone camera and solve it.
5. Upload a photo of a handwritten linear system.
6. Show the compiler pipeline slide: normalize, lex, parse, AST, classify, solve, verify. This is the technical story.
7. Show history (if built) and the network tab proving no external calls.
8. Close with the test suite: 200 problems, 100% passing, and the honest recognition accuracy numbers.

## 14. Open Decisions

These need a quick answer from the team before Phase 1:

- Final project name (MathLens is a working title).
- Whether the Tier 1 scope above is final or should be trimmed to fit the hackathon deadline.
- Whether sign-in uses email and password or free Google OAuth.
- Whether to attempt the custom handwriting model (Phase 7) or ship the Tesseract path only.
