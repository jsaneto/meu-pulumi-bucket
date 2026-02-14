import * as aws from "@pulumi/aws";

/**
 * Cria um Security Group (SG) para controlar o tráfego de rede.
 * Este grupo atua como um firewall na camada da instância.
 */
export const createSecurityGroup = () => {
    const sg = new aws.ec2.SecurityGroup("acesso-web-asg", {
        description: "Permite SSH e HTTP (Porta 80) de entrada",
        
        // --- REGRAS DE ENTRADA (INGRESS) ---
        // Define quais conexões externas podem chegar até suas instâncias
        ingress: [
            // Regra para SSH (Acesso ao Terminal)
            {
                protocol: "tcp",
                fromPort: 22,
                toPort: 22,
                // cidrBlocks ["0.0.0.0/0"] significa que qualquer IP do mundo pode tentar conectar
                cidrBlocks: ["0.0.0.0/0"], 
            },
            
            // Regra para HTTP (Acesso Web via porta 80)
            // Essencial para que o Load Balancer e usuários vejam seu site
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                // Aberto ao mundo: necessário para tráfego web público
                cidrBlocks: ["0.0.0.0/0"], 
            },
        ],

        // --- REGRAS DE SAÍDA (EGRESS) ---
        // Define para onde suas instâncias podem enviar dados
        egress: [
            {
                // Protocolo "-1" indica TODOS os protocolos (TCP, UDP, ICMP, etc.)
                protocol: "-1", 
                fromPort: 0,
                toPort: 0,
                // Permite que a instância acesse qualquer lugar na internet
                // Necessário para rodar 'apt-get update' ou baixar pacotes
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    });

    return sg;
};