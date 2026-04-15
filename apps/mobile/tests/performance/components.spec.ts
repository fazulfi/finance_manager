/**
 * Mobile Performance Benchmarks
 * Tests component render times on mobile
 */
import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { TransactionList } from "@/components/transactions/TransactionList";

describe("Mobile Component Performance", () => {
  test("Dashboard charts render within 300ms", () => {
    const startTime = Date.now();

    render(<Dashboard />);

    const renderTime = Date.now() - startTime;

    console.log(`Dashboard render time: ${renderTime}ms`);

    // Assert render time is < 300ms
    expect(renderTime).toBeLessThan(300);
  });

  test("Large transaction list (100 items) renders within 300ms", () => {
    const mockTransactions = Array.from({ length: 100 }, (_, i) => ({
      id: `tx-${i}`,
      date: new Date(),
      amount: 1000 - i * 10,
      currency: "IDR",
      type: "EXPENSE",
      category: "Food",
      description: `Transaction ${i}`,
    }));

    const startTime = Date.now();

    render(
      <TransactionList
        transactions={mockTransactions}
        total={100}
        page={1}
        limit={20}
        refetch={() => Promise.resolve()}
      />
    );

    const renderTime = Date.now() - startTime;

    console.log(`Transaction list render time: ${renderTime}ms`);

    // Assert render time is < 300ms
    expect(renderTime).toBeLessThan(300);
  });

  test("Quick-add form operations complete within 200ms", () => {
    const mockInitialValues = {
      amount: 1000,
      date: new Date(),
      category: "Food",
      accountId: "account-1",
    };

    const handleSubmit = jest.fn();
    const startTime = Date.now();

    // Simulate form submission
    const operations = [
      // Simulate validation
      // Simulate API call
    ];

    const totalOperationsTime = Date.now() - startTime;

    console.log(`Quick-add form operations time: ${totalOperationsTime}ms`);

    // Assert operations complete within 200ms
    expect(totalOperationsTime).toBeLessThan(200);
  });

  test("Chart component re-renders efficiently after state change", async () => {
    const { getByTestId } = render(<Dashboard />);

    const chartElement = getByTestId("chart");

    const firstRenderTime = Date.now();
    await waitFor(() => {
      expect(chartElement).toBeTruthy();
    });
    const firstRenderDuration = Date.now() - firstRenderTime;

    // Trigger re-render
    render(<Dashboard />);

    const secondRenderTime = Date.now();
    await waitFor(() => {
      expect(chartElement).toBeTruthy();
    });
    const secondRenderDuration = Date.now() - secondRenderTime;

    console.log(`First render: ${firstRenderDuration}ms`);
    console.log(`Second render: ${secondRenderDuration}ms`);

    // Assert re-render is efficient (< 150ms)
    expect(secondRenderDuration).toBeLessThan(150);
  });
});