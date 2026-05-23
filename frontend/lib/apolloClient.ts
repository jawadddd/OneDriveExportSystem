"use client";

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";

let client: ApolloClient | null = null;

export function getApolloClient() {
  if (!client) {
    const authLink = new ApolloLink((operation, forward) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      operation.setContext({
        headers: { authorization: token ? `Bearer ${token}` : "" },
      });
      return forward(operation);
    });

    const httpLink = new HttpLink({
      uri: `${process.env.NEXT_PUBLIC_BACKEND_URL}/graphql`,
      credentials: "include",
    });

    client = new ApolloClient({
      link: ApolloLink.from([authLink, httpLink]),
      cache: new InMemoryCache(),
    });
  }
  return client;
}

export function setAdminToken(token: string) {
  localStorage.setItem("adminToken", token);
}

export function clearAdminToken() {
  localStorage.removeItem("adminToken");
  client?.clearStore();
}

export function getAdminToken() {
  return typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
}
