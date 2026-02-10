// cloudfront.ts
import * as aws from "@pulumi/aws";

export const createCloudFront = (bucket: aws.s3.Bucket) => {
    const oac = new aws.cloudfront.OriginAccessControl("oac", {
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
    });

    const cdn = new aws.cloudfront.Distribution("cdn", {
        enabled: true,
        origins: [{
            // Agora usamos o domínio do bucket passado por argumento
            domainName: bucket.bucketRegionalDomainName,
            originId: bucket.arn,
            originAccessControlId: oac.id,
        }],
        defaultCacheBehavior: {
            targetOriginId: bucket.arn,
            viewerProtocolPolicy: "redirect-to-https",
            allowedMethods: ["GET", "HEAD"],
            cachedMethods: ["GET", "HEAD"],
            forwardedValues: {
                queryString: false,
                cookies: { forward: "none" },
            },
            minTtl: 0,
            defaultTtl: 3600,
            maxTtl: 86400,
        },
        viewerCertificate: {
            cloudfrontDefaultCertificate: true,
        },
        restrictions: {
            geoRestriction: { restrictionType: "none" },
        },
    });

    return cdn;
};