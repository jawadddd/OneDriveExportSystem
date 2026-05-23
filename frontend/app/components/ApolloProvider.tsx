"use client";

import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import { getApolloClient } from "@/lib/apolloClient";

export default function ApolloProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseApolloProvider client={getApolloClient()}>
      {children}
    </BaseApolloProvider>
  );
}
