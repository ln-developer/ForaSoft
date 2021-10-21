import ACTIONS from "../socket/actions";

const initialState = {
  roomId: "",
  roomName: "",
  rooms: [],
  userId: "",
  userName: "",
  time: "",
  text: "",
  message: [],
};

export const chatReducer = (state = initialState, action) => {
  switch (action.type) {
    case ACTIONS.CREATE_ROOM:
      return {
        ...state,
        roomName: action.roomName,
        userName: action.userName,
        roomId: action.roomId,
      };
    case ACTIONS.ADD_TO_ROOM:
      return {
        ...state,
        userName: action.userName,
        roomId: action.roomId,
      };
    case ACTIONS.GET_NAME:
      return {
        ...state,
        roomId: action.roomId,
      };
    case ACTIONS.SEND_NAME:
      return {
        ...state,
        userName: action.userName,
      };
    case ACTIONS.SHARE_ROOMS:
      return {
        ...state,
        rooms: [...action.rooms],
      };
    case ACTIONS.GET_MESSAGE:
      return {
        ...state,
        message: [...state.message, action.message],
      };
    case ACTIONS.SEND_MESSAGE:
      return {
        ...state,
        roomId: action.roomId,
        userId: action.userId,
        userName: action.userName,
        time: action.time,
        text: action.text,
      };
    default:
      return state;
  }
};
