# Setup Instructions

1.  **Stripe Application**:
    *   Create a Stripe account at [stripe.com](https://stripe.com).
    *   Get your **Publishable Key** and **Secret Key** from the Developers Dashboard.

2.  **Environment Variables**:
    *   Create a file named `.env.local` in this directory (`sales-site/`).
    *   Add the following content, replacing the placeholders with your actual keys:

    ```env
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
    STRIPE_SECRET_KEY=sk_test_...
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    ```

3.  **Run the Website**:
    *   Install dependencies (if you haven't):
        ```bash
        npm install
        ```
    *   Start the development server:
        ```bash
        npm run dev
        ```
    *   Open [http://localhost:3000](http://localhost:3000) to see your site.

4.  **Production**:
    *   When deploying (e.g., to Vercel), ensure you add the Environment Variables in the project settings.
