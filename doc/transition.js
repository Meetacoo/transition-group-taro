const {useState} = React;
const {Button} = antd;
const {Transition} = transitionGroupTaro;
const {View} = tarojsComponents;

const BaseExample = () => {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button onClick={() => setShow(prevState => !prevState)}>Toggle</Button>
      <Transition in={show} timeout={500}>
        <View>哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈</View>
      </Transition>
    </>
  );
};

render(<BaseExample/>);
