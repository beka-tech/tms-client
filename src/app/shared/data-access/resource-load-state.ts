export interface ResourceLoadState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

export const IDLE_LOAD_STATE: ResourceLoadState = {
  loading: false,
  loaded: false,
  error: null,
};
