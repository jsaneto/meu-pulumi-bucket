// variables.ts
export const ec2ASG1Type = "t4g.medium"; // Se mudar para t3.medium, mude abaixo para amd64
export const ec2Architecture = "arm64";  // Opções: "arm64" ou "amd64"

export const asgMin = 2;
export const asgMax = 3;
export const cpuThreshold = 60;