import type { DataLoader } from "@remix-run/core";
import { json } from '@remix-run/loader';

let loader: DataLoader = async () => {
  return json({
    message: "this is zzaaazzzawesome 😎",
  }, {
    headers: {
      'cache-control': 'max-age=15'
    }
  });
};

export = loader;
