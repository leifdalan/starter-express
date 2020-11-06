import React from "react";
import { Meta, Scripts, Styles, Routes, useGlobalData } from "@remix-run/react";

export default function App() {
  let data = useGlobalData();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Styles />
      </head>
      <body>
        <Routes />
        
        <footer>
          <p>This page was rendered at {data.date.toLocaleString()}</p>
        </footer>
        <Scripts />
      </body>
    </html>
  );
}
