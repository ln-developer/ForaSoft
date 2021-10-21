import React from "react";
import { useHistory } from "react-router";

export const NotFound = () => {
  const history = useHistory();
  return (
    <div className="wrapper">
      <h1 className="h1">404: NOT FOUND</h1>
      <button
        className="btn"
        onClick={() => {
          history.push("/");
        }}
      >
        To Home page
      </button>
    </div>
  );
};
