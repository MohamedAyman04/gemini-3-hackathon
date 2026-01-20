export interface Mission {
    id: string;
    name: string;
    url: string;
    context: string;
    // happyPath type can be refined later if needed
    happyPath?: any;
    createdAt: string;
    updatedAt: string;
}

export interface Session {
    id: string;
    missionId: string;
    createdAt: string;
    // Add other fields as they become relevant
}
