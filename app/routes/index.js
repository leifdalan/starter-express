import React from "react";
import { useRouteData } from "@remix-run/react";
import { Link } from 'react-router-dom';

import type { HeadersFunction } from '@remix-run/core'

export function meta() {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!"
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
      <h2>Welcome to Remix!</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <Link to="/farts">Link to farts</Link>
      <p>Message from the loader: {data.message}</p>
    </div>
  );
}
