import React from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import { Home } from "./pages/HomePage/Home";
import { Room } from "./pages/RoomPage/Room";
import { NotFound } from "./pages/404Page/404";
import { Provider } from "react-redux";
import { store } from "./store/store";

export const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Switch>
          <Route path="/" component={Home} exact />
          <Route path="/room/:id" component={Room} exact />
          <Route component={NotFound} />
        </Switch>
      </BrowserRouter>
    </Provider>
  );
};
