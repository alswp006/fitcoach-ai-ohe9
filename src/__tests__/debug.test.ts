import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
// Import something from mocks.ts WITHOUT calling any of the mock*() functions.
import { mockNavigate } from "@/__tests__/__helpers__/mocks";

it("debug: does merely importing mocks.ts auto-register its nested vi.mock calls?", async () => {
  void mockNavigate;
  const { Button } = await import("@toss/tds-mobile");
  render(React.createElement(Button, {}, "hi"));
  console.log(document.body.innerHTML);
});
