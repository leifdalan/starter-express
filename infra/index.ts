/* eslint-disable camelcase */
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import { createDistribution } from './cloudfront';
import { createLambda } from './lambda';
import { createCertificates } from './acm';

const config = new pulumi.Config();

const domain = config.get('domain') as string;
const zoneId = config.get('zoneId') as string;

const { certificateArn } = createCertificates({
  domain,
  region: 'us-east-1',
})

const assetBucket = new aws.s3.Bucket('asset-bucket', {
  acl: 'public-read',
  forceDestroy: true,
});

const { lambda } = createLambda();

const { distribution } = createDistribution({ 
  lambda, 
  assetBucket, 
  certificateArn, 
  aliases: [domain], 
  comment: 'Remix app',
});

function upload(dir = __dirname) {
  for (const item of fs.readdirSync(dir)) {
    const filePath = path.join(dir, item);
    if (fs.lstatSync(filePath).isDirectory()) {
      upload(filePath);
    } else {
      const s3Path = filePath.replace(path.join(__dirname, '..', 'public'), '')
      new aws.s3.BucketObject(s3Path, {
        bucket: assetBucket,
        source: new pulumi.asset.FileAsset(filePath), // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
        cacheControl: 'max-age=31536000',
        acl: 'public-read'
      });
    }
  }
}

upload(path.join(__dirname, '..', 'public'));

new aws.route53.Record(domain, {
  name: domain,
  zoneId,
  type: 'A',
  aliases: [
    {
      name: distribution.domainName,
      zoneId: distribution.hostedZoneId,
      evaluateTargetHealth: true,
    },
  ],
});
