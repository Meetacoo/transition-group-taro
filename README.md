
# transition-group-taro


### 安装

```shell
npm i --save @kne/transition-group-taro
```


### 概述

这里填写组件概要说明


### 示例

#### 示例代码

- 这里填写示例标题
- 这里填写示例说明
- 

```jsx
const BaseExample = ()=>{
    return '我是一个示例组件';
};

render(<BaseExample />);

```

- Transition
- 这里填写示例说明
- transitionGroupTaro(@kne/transition-group-taro),lodash(lodash),antd(@kne/antd-taro),tarojsComponents(@tarojs/components)

```jsx
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

```


### API

|属性名|说明|类型|默认值|
|  ---  | ---  | --- | --- |

