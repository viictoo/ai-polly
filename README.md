# ALX Polly: A Polling Application

Welcome to ALX Polly, a full-stack polling application built with Next.js, TypeScript, and Supabase. This project serves as a practical learning ground for modern web development concepts, with a special focus on identifying and fixing common security vulnerabilities.

## About the Application

ALX Polly allows authenticated users to create, share, and vote on polls. It's a simple yet powerful application that demonstrates key features of modern web development:

-   **Authentication**: Secure user sign-up and login.
-   **Poll Management**: Users can create, view, and delete their own polls.
-   **Voting System**: A straightforward system for casting and viewing votes.
-   **User Dashboard**: A personalized space for users to manage their polls.

The application is built with a modern tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Server Components and Client Components

---

## 🚀 The Challenge: Security Audit & Remediation

As a developer, writing functional code is only half the battle. Ensuring that the code is secure, robust, and free of vulnerabilities is just as critical. This version of ALX Polly has been intentionally built with several security flaws, providing a real-world scenario for you to practice your security auditing skills.

**Your mission is to act as a security engineer tasked with auditing this codebase.**

### Your Objectives:

1.  **Identify Vulnerabilities**:
    -   Thoroughly review the codebase to find security weaknesses.
    -   Pay close attention to user authentication, data access, and business logic.
    -   Think about how a malicious actor could misuse the application's features.

2.  **Understand the Impact**:
    -   For each vulnerability you find, determine the potential impact.Query your AI assistant about it. What data could be exposed? What unauthorized actions could be performed?

3.  **Propose and Implement Fixes**:
    -   Once a vulnerability is identified, ask your AI assistant to fix it.
    -   Write secure, efficient, and clean code to patch the security holes.
    -   Ensure that your fixes do not break existing functionality for legitimate users.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## Getting Started

To begin your security audit, you'll need to get the application running on your local machine.

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v20.x or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.io/) account (the project is pre-configured, but you may need your own for a clean slate).

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd alx-polly
npm install
```

### 3. Environment Variables

The project uses Supabase for its backend. An environment file `.env.local` is needed.Use the keys you created during the Supabase setup process.

### 4. Running the Development Server

Start the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

Good luck, engineer! This is your chance to step into the shoes of a security professional and make a real impact on the quality and safety of this application. Happy hunting!

## 🔒 Security Audit Findings and Remedies

During a comprehensive security audit, several potential weaknesses and logic flaws were identified and subsequently patched to enhance the application's robustness and user security.

### Discovered Flaws and Their Remedies:

1.  **Incomplete Redirect Protection**
    *   **Description:** The application's middleware would redirect unauthenticated users to the login page but did not prevent authenticated users from manually navigating to `/login` or `/register` pages.
    *   **Remedy:** The `middleware.ts` file was updated to explicitly redirect authenticated users attempting to access `/login` or `/register` to the `/polls` dashboard, improving user experience and logic flow.
    *   **Relevant File:** `middleware.ts`

2.  **Lack of Client-Side Input Validation**
    *   **Description:** The login and registration forms lacked client-side validation for email format and password strength, relying solely on server-side checks. This led to a suboptimal user experience with delayed feedback and unnecessary server requests.
    *   **Remedy:** Client-side input validation was added to both `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` to ensure proper email format and minimum password length before submission. This provides immediate feedback to users.
    *   **Relevant Files:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

3.  **Unauthorized Access to Admin Page**
    *   **Description:** The `app/(dashboard)/admin/page.tsx` component, intended for administrators, was accessible to any authenticated user. This allowed unauthorized viewing of all polls and the ability to initiate poll deletion.
    *   **Remedy:** The `app/(dashboard)/admin/page.tsx` was converted to a Server Component. An authorization check was implemented to verify if the logged-in user's ID matches a predefined `ADMIN_USER_ID` (set via environment variable). Unauthorized users are now redirected to the login page. Additionally, poll data fetching was moved to the server component for enhanced security.
    *   **Relevant File:** `app/(dashboard)/admin/page.tsx`

4.  **Unauthorized Poll Deletion**
    *   **Description:** The `deletePoll` server action in `app/lib/actions/poll-actions.ts` did not verify if the user attempting to delete a poll was its owner or an administrator. This allowed any authenticated user to delete any poll by knowing its ID.
    *   **Remedy:** An ownership and admin role check was added to the `deletePoll` function. Before deletion, the function now verifies that the requesting user is either the poll's creator or an authorized administrator.
    *   **Relevant File:** `app/lib/actions/poll-actions.ts`

5.  **Unauthorized Poll Viewing (Data Leakage) & Inadequate Server-Side Authorization for Editing Polls**
    *   **Description:** The `getPollById` server action lacked authorization checks, potentially exposing sensitive poll data to any authenticated user who knew a poll's ID. This was further exacerbated by `app/(dashboard)/polls/[id]/edit/page.tsx`, which fetched poll data for editing without prior authorization, leading to unauthorized viewing of poll details.
    *   **Remedy:** An authorization check was integrated into the `getPollById` function. Access is now restricted to the poll owner or an administrator. This ensures that sensitive poll data is not exposed to unauthorized users, both when directly calling the action and when accessing the edit page.
    *   **Relevant Files:** `app/lib/actions/poll-actions.ts`, `app/(dashboard)/polls/[id]/edit/page.tsx`

6.  **Data Leakage via `console.log`**
    *   **Description:** Several `console.log` statements in `app/lib/context/auth-context.tsx` were exposing sensitive user and session data to the client-side console, which could be a security risk in a production environment.
    *   **Remedy:** All identified `console.log` statements in `auth-context.tsx` were commented out to prevent accidental data leakage.
    *   **Relevant File:** `app/lib/context/auth-context.tsx`

### Environment Variable Requirement:

To ensure proper functioning of the administrative access controls, a new environment variable `ADMIN_USER_ID` must be set in your `.env.local` file. This should be the Supabase `user.id` of the user designated as an administrator.

```env
ADMIN_USER_ID="your_admin_supabase_user_id_here"
```

---

## ✅ Verification: End-to-End Tests

To ensure that the implemented security fixes did not introduce regressions and that existing functionality for legitimate users remains intact, a comprehensive suite of End-to-End (E2E) tests has been added using [Playwright](https://playwright.dev/).

### Test Setup:

1.  **Installation:** Playwright was added as a development dependency.
2.  **Configuration:** A `playwright.config.ts` file was created at the project root to configure Playwright with Next.js, defining the test directory (`./e2e`), base URL, and supported browsers.
3.  **Test Script:** An `e2e` script was added to `package.json` to facilitate easy execution of the tests: `npm run e2e`.

### Test Coverage:

The E2E tests cover the following critical user flows and security aspects:

*   **User Authentication:**
    *   Successful user registration and login.
    *   Redirection of authenticated users attempting to access `/login` or `/register` to `/polls`.
    *   Client-side validation errors for missing or invalid credentials during login and registration (e.g., invalid email format, short passwords, mismatched passwords).

*   **Poll Management:**
    *   Authenticated users can successfully create a poll.
    *   Authenticated users can view their own polls.
    *   Authenticated users can edit their own polls.
    *   Prevention of unauthorized users from viewing or editing other users' polls.
    *   Authenticated users can delete their own polls.
    *   Prevention of unauthorized users from deleting other users' polls.

*   **Voting System:**
    *   Users (authenticated or unauthenticated, depending on the `submitVote` configuration) can successfully vote on a poll.

*   **Admin Functionality:**
    *   An administrator can successfully log in and access the `/admin` panel.
    *   The admin can view all polls in the system.
    *   The admin can delete any poll, including those created by other users.
    *   Non-admin users are correctly redirected when attempting to access the `/admin` page.

### How to Run Tests:

To execute the E2E test suite, ensure your development server is running and then use the following command:

```bash
npm run e2e
```

This command will launch the Next.js development server (if not already running) and execute all tests located in the `e2e/` directory across configured browsers. Test reports will be generated upon completion.
