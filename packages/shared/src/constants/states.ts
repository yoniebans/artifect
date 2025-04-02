export enum ArtifactState {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    APPROVED = 'Approved',
}

export const ARTIFACT_STATE_IDS = {
    [ArtifactState.TODO]: '1',
    [ArtifactState.IN_PROGRESS]: '2',
    [ArtifactState.APPROVED]: '3',
};