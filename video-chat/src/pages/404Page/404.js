import "./404.css";
import React from "react";
import { useHistory } from "react-router";

//переходим на эту страницу, если был введен неверный URL
//или пользователь перезагрузил страницу и принудительно вышел из комнаты
export const NotFound = () => {
  const history = useHistory();
  return (
    <div className="notFound">
      <h1 className="notFound_title">404: NOT FOUND</h1>
      <button
        className="notFound_btn-goHome"
        onClick={() => {
          history.push("/");
        }}
      >
        To Home page
      </button>
    </div>
  );
};
