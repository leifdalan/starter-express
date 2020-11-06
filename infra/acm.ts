import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const tenMinutes = 60 * 10;

let certificateArn: pulumi.Input<string>;

export function getDomainAndSubdomain(
  domain: string,
): { subdomain: string; parentDomain: string } {
  const parts = domain.split('.');
  if (parts.length < 2) {
    throw new Error(`No TLD found on ${domain}`);
  }
  // No subdomain, e.g. awesome-website.com.
  if (parts.length === 2) {
    return { subdomain: '', parentDomain: domain };
  }

  const subdomain = parts[0];
  parts.shift(); // Drop first element.
  return {
    subdomain,
    // Trailing "." to canonicalize domain.
    parentDomain: `${parts.join('.')}.`,
  };
}

interface CertI {
  domain: string;
  subDomains?: string[];
  region: 'us-east-1' | 'us-west-2';
}

export function createCertificates({
  domain,
  subDomains = [],
  region,
}: CertI) {

  const providerRegion = new aws.Provider('provider', {
    region, // Per AWS, ACM certificate must be in the us-east-1 region.
    profile: aws.config.profile,
  });

  const certificate = new aws.acm.Certificate(
    'certificate',
    {
      domainName: domain,
      validationMethod: 'DNS',
      subjectAlternativeNames: subDomains,
      tags: {
        Name: 'remix cert',
      }
    },

    { provider: providerRegion },
  );
  const config = new pulumi.Config();
  const zoneId = config.get('zoneId') as string;

  /**
   *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
   *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
   */

  const certificateValidationDomain = new aws.route53.Record(
    `${domain}-validation0`,
    {
      name: certificate.domainValidationOptions[0].resourceRecordName,
      zoneId,
      type: certificate.domainValidationOptions[0].resourceRecordType,
      records: [certificate.domainValidationOptions[0].resourceRecordValue],
      ttl: tenMinutes,
    },
  );

  /**
   * This is a _special_ resource that waits for ACM to complete validation via the DNS record
   * checking for a status of "ISSUED" on the certificate itself. No actual resources are
   * created (or updated or deleted).
   *
   * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
   * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
   * for the actual implementation.
   */
  const certificateValidation = new aws.acm.CertificateValidation(
    'certificateValidation',
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [
        certificateValidationDomain.fqdn,
        // add validations here
      ],
    },
    { provider: providerRegion },
  );

  certificateArn = certificateValidation.certificateArn;

  return { certificateArn };
}
