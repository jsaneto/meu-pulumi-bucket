import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createWaf(resourceArn: pulumi.Input<string>) {
    // 1. Cria a Web ACL
    const webAcl = new aws.wafv2.WebAcl("main-waf", {
        scope: "REGIONAL", // Use 'CLOUDFRONT' se fosse aplicar direto na CDN
        defaultAction: { allow: {} }, // Permite por padrão, bloqueia o que casar com as regras
        visibilityConfig: {
            cloudwatchMetricsEnabled: true,
            metricName: "mainWafMetric",
            sampledRequestsEnabled: true,
        },
        rules: [
            // Regra 1: Rate Limit (Bloqueia IPs com > 500 requisições em 5 min)
            {
                name: "RateLimit",
                priority: 1,
                action: { block: {} },
                statement: {
                    rateBasedStatement: {
                        limit: 500,
                        aggregateKeyType: "IP",
                    },
                },
                visibilityConfig: {
                    cloudwatchMetricsEnabled: true,
                    metricName: "RateLimitMetric",
                    sampledRequestsEnabled: true,
                },
            },
            // Regra 2: Regras Gerenciadas da AWS (Proteção básica contra exploits)
            {
                name: "AWSCommonRuleSet",
                priority: 2,
                overrideAction: { none: {} },
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: "AWS",
                        name: "AWSManagedRulesCommonRuleSet",
                    },
                },
                visibilityConfig: {
                    cloudwatchMetricsEnabled: true,
                    metricName: "CommonRuleMetric",
                    sampledRequestsEnabled: true,
                },
            },
        ],
    });

    // 2. Associa a Web ACL ao Load Balancer
    const association = new aws.wafv2.WebAclAssociation("waf-assoc", {
        resourceArn: resourceArn,
        webAclArn: webAcl.arn,
    });

    return webAcl;
}