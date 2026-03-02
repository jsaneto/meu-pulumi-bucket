import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria uma zona DNS privada vinculada à sua VPC.
 */
export const createPrivateDns = (
    vpcId: pulumi.Input<string>,
    albDnsName: pulumi.Input<string>,
    albZoneId: pulumi.Input<string>
) => {

    // 1. Criar a Zona Hospedada Privada
    const privateZone = new aws.route53.Zone("private-zone", {
        name: "meulab.interno", // Nome fictício que você escolher
        vpcs: [{
            vpcId: vpcId, // Vincula a zona à sua VPC do arquivo vpc.ts
        }],
        comment: "Zona DNS para uso interno no lab ACG",
    });

    // 2. Criar o registro ALIAS apontando para o Load Balancer
    const albRecord = new aws.route53.Record("alb-alias-record", {
        zoneId: privateZone.id,
        name: "app.meulab.interno", // O endereço final será este
        type: "A",
        aliases: [{
            name: albDnsName,
            zoneId: albZoneId,
            evaluateTargetHealth: true,
        }],
    });

    return {
        internalUrl: albRecord.fqdn,
        zoneId: privateZone.id
    };
};