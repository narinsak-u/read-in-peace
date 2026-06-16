Act as an Expert Full-Stack Developer and UI/UX Designer. Your task is to build a complete web application called "Read in Peace". The platform allows users to read reviews, as well as borrow, return, and buy books. 

Please use the following tech stack: Next.js (App Router), TypeScript, Tailwind CSS for styling, and Jotai for state management. Ensure the code follows Clean Architecture principles, with reusable components and clear separation of concerns.

Here are the specific requirements for the pages and features:

### 1. Pages & UI Layouts
*   **Landing Page:**
    *   Design a minimal, modern aesthetic. 
    *   Implement an animated background (e.g., a smooth, slow-moving mesh gradient or subtle floating particles).
    *   Center a sleek, prominent Call-to-Action (CTA) button that says "Enter Library" which navigates to the Feed page.
*   **Feed Page:**
    *   **Hero Section:** A "Top 3 Popular Books" showcase (use a visually distinct layout like a featured grid or a carousel).
    *   **Main Content:** A book list section displaying standard book cards. 
    *   **Book Cards:** Each card must display the book cover, title, author, and two buttons: "Borrow" and "Buy Now". Clicking the card itself should route to the Individual Book Page.
    *   **Pagination:** Include functional pagination controls at the bottom of the list.
*   **Individual Book Page:**
    *   **Layout:** A two-column layout. The left column contains a large, high-quality book cover image. The right column contains the book metadata (title, author, synopsis, price, availability).
    *   **Social Features:** On the right side, below the metadata, include interactive icons/buttons for "Like", "Comment", and "Share".
    *   **Action Buttons:** Prominent "Borrow" and "Buy Now" buttons.
    *   **Comments Section:** A dedicated section at the bottom of the page displaying user reviews and a text area to submit a new comment.
*   **User Dashboard Page:**
    *   A private route displaying the user's activity.
    *   Include two distinct tabs or sections: "Currently Borrowed" (with options/buttons to "Return") and "Purchased Books".

### 2. Core Features & Functionality
*   **Authentication:** Implement a mock authentication flow (or integrate NextAuth/Auth.js if providing a full backend setup) to protect the Dashboard and restrict borrowing/buying to logged-in users.
*   **Social Interactions:** State management should handle liking, commenting, and sharing a book.
*   **E-commerce / Library Logic:** State management for borrowing (checking availability, adding to user's borrowed list) and buying (adding to purchased list).
*   **Admin/Owner CRUD Operations:** Create a mock role-based check where an "Owner" can Create, Update, or Delete book entries from the database/state.

### 3. Execution Instructions
*   Please provide the necessary project setup commands.
*   Generate the global state setup (Jotai atoms for user session and book inventory).
*   Provide the code for the reusable components (BookCard, Button, Navbar).
*   Provide the page-level code for the Landing, Feed, Individual Book, and Dashboard pages.
*   Include mock data for at least 6 books to populate the Feed Page.