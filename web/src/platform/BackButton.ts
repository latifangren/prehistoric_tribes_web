export interface BackButtonAdapter {
  subscribe(handler: () => void): () => void;
}

export const webBackButtonAdapter: BackButtonAdapter = {
  subscribe: () => () => {},
};
