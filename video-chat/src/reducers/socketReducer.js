import ACTIONS from "../socket/actions";

const initialState = {
  roomId: "",
  peerId: "",
};

export const socketReducer = (state = initialState, action) => {
  switch (action.type) {
    case ACTIONS.JOIN_ROOM:
      return {
        ...state,
        roomId: action.roomId,
      };
    case ACTIONS.LEAVE_ROOM:
      return {
        ...state,
      };
    case ACTIONS.ADD_PEER:
      return {
        ...state,
      };
    case ACTIONS.REMOVE_PEER:
      return {
        ...state,
      };
    case ACTIONS.RELAY_SDP:
      return {
        ...state,
      };
    case ACTIONS.RELAY_ICE:
      return {
        ...state,
      };
    case ACTIONS.ICE_CANDIDATE:
      return {
        ...state,
      };
    case ACTIONS.SESSION_DESCRIPTION:
      return {
        ...state,
      };
    default:
      return state;
  }
};
