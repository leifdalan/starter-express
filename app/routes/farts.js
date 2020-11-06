import React from "react";
import { useRouteData } from "@remix-run/react";

export function meta() {
  return {
    title: "Remix Starter",
    description: "Welcome to farts!"
  };
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    'cache-control': loaderHeaders.get('cache-control')
  }
}


export default function Index() {
  let data = useRouteData();

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>farts</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <p>Message from the loader: {data.message}</p>
    </div>
  );
}
