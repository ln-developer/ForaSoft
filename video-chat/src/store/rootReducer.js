import { combineReducers } from "redux";
import { chatReducer } from "../reducers/chatReducer";
// import { socketReducer } from "../reducers/socketReducer";

export const rootReducer = combineReducers({
  chat: chatReducer,
  // socket: socketReducer,
});
