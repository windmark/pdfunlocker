import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "../NavLink";

describe("NavLink", () => {
  it("renders a link with children", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/">Home</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("applies activeClassName when route is active", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <NavLink to="/about" className="base" activeClassName="active-class">
          About
        </NavLink>
      </MemoryRouter>
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("active-class");
    expect(link.className).toContain("base");
  });

  it("does not apply activeClassName when route is inactive", () => {
    render(
      <MemoryRouter initialEntries={["/other"]}>
        <NavLink to="/about" className="base" activeClassName="active-class">
          About
        </NavLink>
      </MemoryRouter>
    );
    const link = screen.getByRole("link");
    expect(link.className).not.toContain("active-class");
  });
});
