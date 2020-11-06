import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';


interface GetBucketsI {
  aliases: string[];
  certificateArn: pulumi.OutputInstance<string>;
  comment: string;
  assetBucket: aws.s3.Bucket;
  lambda: aws.lambda.Function;
}

const s3OriginId = 'S3PhotoOrigin';
const fakeOrigin = 'fakeOrigin';

const s3CacheBehavior = {
  allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  cachedMethods: ['GET', 'HEAD'],
  compress: true,
  defaultTtl: 3600,
  forwardedValues: {
    cookies: {
      forward: 'all',
    },
    queryString: true,
    headers: [
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
      'Origin',
    ],
  },
  maxTtl: 86400,
  minTtl: 0,
  pathPattern: '/build/*',
  targetOriginId: s3OriginId,
  viewerProtocolPolicy: 'redirect-to-https',
};



export function createDistribution({
  aliases = [],
  certificateArn,
  comment,
  assetBucket,
  lambda
}: GetBucketsI) {
  
  const distribution = new aws.cloudfront.Distribution('remix-distro', {
    aliases,
    comment,
    defaultCacheBehavior: {
      allowedMethods: [
        'DELETE',
        'GET',
        'HEAD',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
      ],
      cachedMethods: ['GET', 'HEAD'],
      defaultTtl: 3600,
      forwardedValues: {
        cookies: {
          forward: 'all',
        },
        queryString: true,
        headers: [
          'Access-Control-Request-Headers',
          'Access-Control-Request-Method',
          'Origin',
        ],
      },
      maxTtl: 86400,
      minTtl: 0,
      targetOriginId: s3OriginId,
      viewerProtocolPolicy: 'allow-all',
    },
    enabled: true,
    isIpv6Enabled: true,
    orderedCacheBehaviors: [
      s3CacheBehavior,
      {
        ...s3CacheBehavior,
        pathPattern: '/favicon.ico',
      },
      {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        compress: true,
        defaultTtl: 3600,
        forwardedValues: {
          cookies: {
            forward: 'all',
          },
          queryString: true,
          headers: [
            'Access-Control-Request-Headers',
            'Access-Control-Request-Method',
            'Origin',
          ],
        },
        maxTtl: 86400,
        minTtl: 0,
        pathPattern: '/*',
        targetOriginId: fakeOrigin,
        lambdaFunctionAssociations: [{
          eventType: 'origin-request',
          lambdaArn: pulumi.interpolate`${lambda.arn}:${lambda.version}`,
          includeBody: true,
        }],
        viewerProtocolPolicy: 'redirect-to-https',
      },
    ],
    origins: [
      {
        domainName: assetBucket.bucketRegionalDomainName,
        originId: s3OriginId,
      },
      {
        domainName: 'fake.com',
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: 'http-only',
          originSslProtocols: ['TLSv1']
        },
        originId: fakeOrigin,
      },
    ],
    priceClass: 'PriceClass_200',
    restrictions: {
      geoRestriction: {
        restrictionType: 'none',
      },
    },
    viewerCertificate: {
      acmCertificateArn: certificateArn,
      sslSupportMethod: 'sni-only',
    },
  });

  return { distribution }
}

  