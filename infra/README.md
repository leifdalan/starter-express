# Deployment

This folder utilizes [pulumi](https://pulumi.com) to orchestrate a deployment on AWS resources. You'll need to [download and install pulumi](https://www.pulumi.com/docs/get-started/install/) to use this folder.

From this folder, initialize a "stack":

`pulumi stack init`

Whatever you name your stack, create a yml file Pulumi.\<stack name>.yaml and use the example to populate. 

This deployment stack assumes you own a domain, and that domain's DNS is pointed to AWS Route53. The "Zone ID" in the config is the zone id of the domain in route 53.

To deploy, from this folder, run:

`./prepare.sh`

`PULUMI_DISABLE_PROVIDER_PREVIEW=1 pulumi up`

The flag can be removed as soon as this issue is addressed: https://github.com/pulumi/pulumi/issues/5634
