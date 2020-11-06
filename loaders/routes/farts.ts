import type { DataLoader } from "@remix-run/core";
import { json } from '@remix-run/loader';

let loader: DataLoader = async () => {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return json({
    message: "this is other data that takes 3000ms on purpose.",
  }, {
    headers: {
      'cache-control': 'max-age=10'
    }
  });
};

export = loader;
