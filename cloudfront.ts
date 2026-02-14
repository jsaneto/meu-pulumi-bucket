// cloudfront.ts
import * as aws from "@pulumi/aws";

/**
 * Cria uma distribuição CloudFront para servir conteúdo de um Bucket S3 de forma segura e rápida.
 * param bucket O bucket S3 que servirá como origem dos arquivos.
 */
export const createCloudFront = (bucket: aws.s3.Bucket) => {
    
    // 1. Origin Access Control (OAC)
    // Esta é a configuração moderna de segurança da AWS. 
    // Ela garante que o S3 consiga identificar que a requisição está vindo do seu CloudFront.
    const oac = new aws.cloudfront.OriginAccessControl("oac", {
        originAccessControlOriginType: "s3",
        signingBehavior: "always", // Sempre assina a requisição para máxima segurança
        signingProtocol: "sigv4",  // Protocolo de assinatura padrão da AWS
    });

    // 2. Distribuição CloudFront
    const cdn = new aws.cloudfront.Distribution("cdn", {
        enabled: true, // Ativa a distribuição imediatamente após a criação
        
        // Definição da Origem (De onde os arquivos vêm)
        origins: [{
            // Usamos o domínio regional do bucket para evitar problemas de propagação de DNS
            domainName: bucket.bucketRegionalDomainName,
            originId: bucket.arn, // Identificador único para esta origem dentro da CDN
            originAccessControlId: oac.id, // Conecta o OAC para permitir o acesso ao bucket privado
        }],

        // Comportamento padrão de Cache
        defaultCacheBehavior: {
            targetOriginId: bucket.arn,
            // Redireciona automaticamente qualquer acesso HTTP para HTTPS (Segurança)
            viewerProtocolPolicy: "redirect-to-https",
            
            allowedMethods: ["GET", "HEAD"], // Métodos permitidos para os usuários
            cachedMethods: ["GET", "HEAD"],  // Métodos cujas respostas serão guardadas no cache da CDN
            
            // Otimização: Não repassa Query Strings ou Cookies para o S3 (Melhora a taxa de acerto do cache)
            forwardedValues: {
                queryString: false,
                cookies: { forward: "none" },
            },

            // Configurações de Tempo de Vida (TTL) em segundos
            minTtl: 0,
            defaultTtl: 3600,  // 1 hora de cache por padrão
            maxTtl: 86400,     // 24 horas no máximo
        },

        // Certificado SSL/TLS
        viewerCertificate: {
            // Usa o certificado padrão da CloudFront (*.cloudfront.net)
            cloudfrontDefaultCertificate: true,
        },

        // Restrições de acesso geográfico
        restrictions: {
            // "none" permite que usuários de qualquer lugar do mundo acessem o conteúdo
            geoRestriction: { restrictionType: "none" },
        },
    });

    return cdn;
};