import { Suspense } from "react";
import {
  StackHandler,
  StackProvider,
  StackTheme,
  useUser,
} from "@stackframe/react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./App.css";

import { stackClientApp } from "@/stack/client";
import GlobalCounter from "@/components/global-counter";

const queryClient = new QueryClient();

function HandlerRoutes() {
  const location = useLocation();
  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BrowserRouter>
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/handler/*" element={<HandlerRoutes />} />
                <Route path="/" element={<Content />} />
              </Routes>
            </QueryClientProvider>
          </StackTheme>
        </StackProvider>
      </BrowserRouter>
    </Suspense>
  );
}

function Content() {
  const user = useUser();

  const authenticated = user !== null;

  return (
    <>
      <div>
        <a href="https://neon.com/docs/data-api/get-started" target="_blank">
          <img src="/neon.svg" className="logo neon" alt="Neon logo" />
        </a>
      </div>
      <h1>Neon</h1>
      <p className="read-the-docs">
        Click on the Neon logo to learn more{" "}
        {!authenticated && "and sign in to check out the demo app"}
      </p>
      <div>
        <button
          onClick={() => {
            if (authenticated) {
              void stackClientApp.redirectToSignOut();
            } else {
              void stackClientApp.redirectToSignIn();
            }
          }}
        >
          {authenticated ? "Sign out" : "Sign in"}
        </button>
      </div>
      {authenticated && <GlobalCounter />}
    </>
  );
}

export default App;
