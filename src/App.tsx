import * as React from "react";

import * as Data from "./data";
import * as ModalDialog from "./ModalDialog";
import * as SankeyDiagram from "./SankeyDiagram";

import "./App.css";

type State = {
  activeModalDialogProps?: ModalDialog.DataProps;
  data?: Data.SSData;
};

class App extends React.Component<{}, State> {
  public state: State = {};

  public componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }
    window.addEventListener("message", this.onReceiveMessage, false);
  }

  public componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
    window.removeEventListener("message", this.onReceiveMessage, false);
  }

  public render() {
    let modalDialog: any;
    if (this.state.activeModalDialogProps !== undefined) {
      modalDialog = React.createElement(
        ModalDialog.Component,
        {
          ...this.state.activeModalDialogProps,
          onDismiss: this.dismissModalDialog
        }
      );
    }

    return (
      <div className="App">
        {
          this.state.data === undefined
            ? (
                <div className="App-statusMessageContainer">
                  <div className="App-statusMessage">
                    Waiting for data...
                  </div>
                </div>
              )
            : (
                <SankeyDiagram.Component
                  showModalDialog={this.showModalDialog}
                  data={this.state.data}
                />
              )
          }
        {modalDialog}
      </div>
    );
  }

  private dismissModalDialog = () => {
    this.setState({
      activeModalDialogProps: undefined
    });
  }

  private showModalDialog = (props: ModalDialog.DataProps) => {
    this.setState({
      activeModalDialogProps: props
    });
  }

  private onReceiveMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data as string) as Data.SSData;
    this.setState({
      data: data
    });
  }
}

export default App;
