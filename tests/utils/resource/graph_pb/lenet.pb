
³
	
args1 

cst1 

cst2 1OneHot"CDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits*

pri_format:NC1HWC0*
axisÿÿÿÿÿÿÿÿÿ*
output_names 
:output*
IsFeatureMapOutput*>
input_names/:indices:on_value:	off_value*
depth
*"
IsFeatureMapInputList		  2
 

BNDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits/OneHot-op0
©

conv2.weight 2Cast":Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d*
_datadump_original_names*
IsFeatureMapInputList*
is_backed_cast*
IsFeatureMapOutput 2



BEDefault/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/Cast-op188
©

conv1.weight 3Cast":Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d*
_datadump_original_names*
IsFeatureMapInputList*
is_backed_cast*
IsFeatureMapOutput 2



BEDefault/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/Cast-op189

	
args0 4	TransData"Default*

dst_format:NC1HWC0*"
IsFeatureMapInputList		  *

pri_format:NC1HWC0*
_datadump_original_names*
IsFeatureMapOutput*

src_format:NCHW2
 

 
 BDefault/TransData-op99
¥

4 5Cast":Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 

 
 BEDefault/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/Cast-op190
ù

5 

3 6Conv2D":Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d*(
stride*
pad *
kernel_size*
out_channel*
mode**
dilation*
output_names 
:output*
group*
pad_mode	:valid*
data_format:NCHW*
offset_a *!
input_names :x:w**
pad_list    *
IsFeatureMapOutput*"
IsFeatureMapInputList		  *

pri_format:NC1HWC02
 


BEDefault/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/Conv2D-op1
¥

6 7Cast":Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BEDefault/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/Cast-op191
ç

7 8ReLUV2"7Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU*
_datadump_is_multiop*
IsFeatureMapOutput*

pri_format:NC1HWC0*Å
_datadump_original_names¨D:@Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op2\:XGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op54*"
IsFeatureMapInputList		  2

BCDefault/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLUV2-op87
c

8 

cst3 9tuple_getitem"Default2
 


BDefault/tuple_getitem-op193
¶

9 10Cast"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BMDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/Cast-op195
ý

10 11MaxPoolWithArgmax"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*'
atomic_output_clean_indexs		 *"
IsFeatureMapInputList		  *

pri_format:NC1HWC0*)
strides*'
ksize*
padding	:VALID*
input_names
 :x*
output_names 
:output*
IsFeatureMapOutput2

BXDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/MaxPoolWithArgmax-op3
e

11 

cst4 12tuple_getitem"Default2
 


BDefault/tuple_getitem-op197
û

12 

2 13Conv2D":Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d*(
stride*
pad *
kernel_size*
out_channel*
mode**
dilation*
output_names 
:output*
group*
pad_mode	:valid*
data_format:NCHW*
offset_a *!
input_names :x:w**
pad_list    *
IsFeatureMapOutput*"
IsFeatureMapInputList		  *

pri_format:NC1HWC02
 




BEDefault/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/Conv2D-op5
§

13 14Cast":Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 




BEDefault/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/Cast-op201
é

14 15ReLUV2"7Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU*
_datadump_is_multiop*
IsFeatureMapOutput*

pri_format:NC1HWC0*Å
_datadump_original_names¨D:@Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op6\:XGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op47*"
IsFeatureMapInputList		  2

BCDefault/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLUV2-op89
e

15 

cst5 16tuple_getitem"Default2
 




BDefault/tuple_getitem-op203
·

16 17Cast"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 




BMDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/Cast-op205
ý

17 18MaxPoolWithArgmax"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*'
atomic_output_clean_indexs		 *"
IsFeatureMapInputList		  *

pri_format:NC1HWC0*)
strides*'
ksize*
padding	:VALID*
input_names
 :x*
output_names 
:output*
IsFeatureMapOutput2

BXDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/MaxPoolWithArgmax-op7
e

18 

cst6 19tuple_getitem"Default2
 


BDefault/tuple_getitem-op207
·

19 20Cast"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BMDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/Cast-op208
÷

20 21	TransData"BDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d*

dst_format:NCHW*"
IsFeatureMapInputList		  *

pri_format:NC1HWC0*
_datadump_original_names*
IsFeatureMapOutput*

src_format:NC1HWC02
 


BRDefault/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/TransData-op123


21 22Reshape"=Default/network-WithLossCell/_backbone-LeNet5/flatten-Flatten*

pri_format:NC1HWC0*
output_names 
:output*"
shape ÿÿÿÿÿÿÿÿÿ*
input_names
:tensor*
IsFeatureMapOutput*"
IsFeatureMapInputList		  *
is_AICPU_kernel2	
 
BIDefault/network-WithLossCell/_backbone-LeNet5/flatten-Flatten/Reshape-op9


22 


fc1.weight 

fc1.bias 23MatMul"7Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense*
output_used_num	*

pri_format:DefaultFormat*
has_bias*"
IsFeatureMapInputList		  *
transpose_x2*
transpose_b*
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2
 
xBCDefault/network-WithLossCell/_backbone-LeNet5/fc3-Dense/MatMul-op10
½

23 24ReLU"7Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
IsFeatureMapOutput*
input_names
 :x*
output_names 
:output2
 
xBADefault/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op12


24 


fc2.weight 

fc2.bias 25MatMul"7Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense*
output_used_num	*

pri_format:DefaultFormat*
has_bias*"
IsFeatureMapInputList		  *
transpose_x2*
transpose_b*
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2
 
TBCDefault/network-WithLossCell/_backbone-LeNet5/fc3-Dense/MatMul-op13
½

25 26ReLU"7Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
IsFeatureMapOutput*
input_names
 :x*
output_names 
:output2
 
TBADefault/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op15
æ

26 


fc3.weight 

fc3.bias 27MatMul"7Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense*

pri_format:DefaultFormat*
has_bias*"
IsFeatureMapInputList		  *
transpose_x2*
transpose_b*
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2
 

BCDefault/network-WithLossCell/_backbone-LeNet5/fc3-Dense/MatMul-op16
Ý

27 

1 28SoftmaxCrossEntropyWithLogits"CDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits*
IsFeatureMapOutput*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 2

BfDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits/SoftmaxCrossEntropyWithLogits-op18
]

28 

cst7 29tuple_getitem"Default2
 

BDefault/tuple_getitem-op210
½

29 

cst8 30Mul"oGradients/Default/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits/gradSoftmaxCrossEntropyWithLogits*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
IsFeatureMapOutput*!
input_names :x:y*
output_names 
:output2
 

BxGradients/Default/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits/gradSoftmaxCrossEntropyWithLogits/Mul-op20
¸

30 31BiasAddGrad"MGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd*'
atomic_output_clean_indexs		  *
output_names 
:output*
input_names :dout*
data_format:NCHW*"
IsFeatureMapInputList		  *

pri_format:DefaultFormat*
IsFeatureMapOutput2

B^Gradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd/BiasAddGrad-op21
ê

fc3.bias 

moments.fc3.bias 

learning_rate 

31 

momentum 32ApplyMomentum"Default/optimizer-Momentum*

pri_format:NC1HWC0*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op22


32 

cst9 33tuple_getitem"Default/optimizer-Momentum2

B.Default/optimizer-Momentum/tuple_getitem-op250


32 
	
cst10 34tuple_getitem"Default/optimizer-Momentum2

B.Default/optimizer-Momentum/tuple_getitem-op251
X

34 

33 35
make_tuple"Default2

BDefault/make_tuple-op65
g
	
cst11 

35 36Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op23
ï

30 

26 37MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 *
transpose_x2 *
transpose_b *
transpose_a*#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x12


TBXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op24
ô


fc3.weight 

moments.fc3.weight 

learning_rate 

37 

momentum 38ApplyMomentum"Default/optimizer-Momentum*

pri_format:DefaultFormat*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op25


38 
	
cst12 39tuple_getitem"Default/optimizer-Momentum2


TB.Default/optimizer-Momentum/tuple_getitem-op253


38 
	
cst13 40tuple_getitem"Default/optimizer-Momentum2


TB.Default/optimizer-Momentum/tuple_getitem-op254
X

40 

39 41
make_tuple"Default2

BDefault/make_tuple-op68
g
	
cst14 

41 42Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op26


30 


fc3.weight 43MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*
output_used_num	*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
transpose_x2 *
transpose_b *
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2
 
TBXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op27


43 

26 44ReluGrad"JGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 *
IsFeatureMapOutput**
input_names :
y_backprop:x*
output_names 
:output2
 
TBXGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op28
¸

44 45BiasAddGrad"MGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd*'
atomic_output_clean_indexs		  *
output_names 
:output*
input_names :dout*
data_format:NCHW*"
IsFeatureMapInputList		  *

pri_format:DefaultFormat*
IsFeatureMapOutput2
TB^Gradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd/BiasAddGrad-op29
ê

fc2.bias 

moments.fc2.bias 

learning_rate 

45 

momentum 46ApplyMomentum"Default/optimizer-Momentum*

pri_format:NC1HWC0*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op30


46 
	
cst15 47tuple_getitem"Default/optimizer-Momentum2
TB.Default/optimizer-Momentum/tuple_getitem-op256


46 
	
cst16 48tuple_getitem"Default/optimizer-Momentum2
TB.Default/optimizer-Momentum/tuple_getitem-op257
X

48 

47 49
make_tuple"Default2

BDefault/make_tuple-op71
g
	
cst17 

49 50Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op31
ï

44 

24 51MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 *
transpose_x2 *
transpose_b *
transpose_a*#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x12
T
xBXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op32
ô


fc2.weight 

moments.fc2.weight 

learning_rate 

51 

momentum 52ApplyMomentum"Default/optimizer-Momentum*

pri_format:DefaultFormat*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op33


52 
	
cst18 53tuple_getitem"Default/optimizer-Momentum2
T
xB.Default/optimizer-Momentum/tuple_getitem-op259


52 
	
cst19 54tuple_getitem"Default/optimizer-Momentum2
T
xB.Default/optimizer-Momentum/tuple_getitem-op260
X

54 

53 55
make_tuple"Default2

BDefault/make_tuple-op74
g
	
cst20 

55 56Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op34


44 


fc2.weight 57MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*
output_used_num	*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
transpose_x2 *
transpose_b *
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2
 
xBXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op35


57 

24 58ReluGrad"JGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 *
IsFeatureMapOutput**
input_names :
y_backprop:x*
output_names 
:output2
 
xBXGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op36
¸

58 59BiasAddGrad"MGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd*'
atomic_output_clean_indexs		  *
output_names 
:output*
input_names :dout*
data_format:NCHW*"
IsFeatureMapInputList		  *

pri_format:DefaultFormat*
IsFeatureMapOutput2
xB^Gradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradBiasAdd/BiasAddGrad-op37
ê

fc1.bias 

moments.fc1.bias 

learning_rate 

59 

momentum 60ApplyMomentum"Default/optimizer-Momentum*

pri_format:NC1HWC0*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op38


60 
	
cst21 61tuple_getitem"Default/optimizer-Momentum2
xB.Default/optimizer-Momentum/tuple_getitem-op262


60 
	
cst22 62tuple_getitem"Default/optimizer-Momentum2
xB.Default/optimizer-Momentum/tuple_getitem-op263
X

62 

61 63
make_tuple"Default2

BDefault/make_tuple-op77
g
	
cst23 

63 64Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op39
ð

58 

22 65MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*

pri_format:DefaultFormat*)
IsFeatureMapInputList	  	 *
transpose_x2 *
transpose_b *
transpose_a*#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x12	
x
BXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op40
ô


fc1.weight 

moments.fc1.weight 

learning_rate 

65 

momentum 66ApplyMomentum"Default/optimizer-Momentum*

pri_format:DefaultFormat*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op41


66 
	
cst24 67tuple_getitem"Default/optimizer-Momentum2	
x
B.Default/optimizer-Momentum/tuple_getitem-op265


66 
	
cst25 68tuple_getitem"Default/optimizer-Momentum2	
x
B.Default/optimizer-Momentum/tuple_getitem-op266
X

68 

67 69
make_tuple"Default2

BDefault/make_tuple-op80
g
	
cst26 

69 70Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op42
j

15 
	
cst27 71tuple_getitem"Default2
 





BDefault/tuple_getitem-op202
f

18 
	
cst28 72tuple_getitem"Default2
 


BDefault/tuple_getitem-op206
ñ

58 


fc1.weight 73MatMul"LGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul*

pri_format:DefaultFormat*"
IsFeatureMapInputList		  *
transpose_x2 *
transpose_b *
transpose_a *#
input_names :x1:x2*
output_names 
:output*
	io_format:ND*
IsFeatureMapOutput*
transpose_x1 2	
 
BXGradients/Default/network-WithLossCell/_backbone-LeNet5/fc3-Dense/gradMatMul/MatMul-op44
Ê

73 74Reshape"SGradients/Default/network-WithLossCell/_backbone-LeNet5/flatten-Flatten/gradReshape*

pri_format:DefaultFormat*
output_names 
:output*'
shape *
input_names
:tensor*
IsFeatureMapOutput*"
IsFeatureMapInputList		  *
is_AICPU_kernel2
 


B`Gradients/Default/network-WithLossCell/_backbone-LeNet5/flatten-Flatten/gradReshape/Reshape-op45


74 75	TransData"SGradients/Default/network-WithLossCell/_backbone-LeNet5/flatten-Flatten/gradReshape*

dst_format:NC1HWC0*"
IsFeatureMapInputList		  *

pri_format:NC1HWC0*
_datadump_original_names*
IsFeatureMapOutput*

src_format:NCHW2
 


BcGradients/Default/network-WithLossCell/_backbone-LeNet5/flatten-Flatten/gradReshape/TransData-op148
÷

75 76Cast"bGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BmGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax/Cast-op232


17 

76 

72 77MaxPoolGradWithArgmax"bGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax*'
atomic_output_clean_indexs		  *0
IsFeatureMapInputList	  	 	 *

pri_format:NC1HWC0*)
strides*'
ksize*
padding	:VALID*<
input_names- :x_origin:
out_origin:grad*
output_names 
:output*
IsFeatureMapOutput2
 




B}Gradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax/MaxPoolGradWithArgmax-op46
÷

77 78Cast"bGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 




BmGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax/Cast-op234
°

78 

71 79
ReluGradV2"JGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU*
_datadump_is_multiop*
IsFeatureMapOutput*

pri_format:DefaultFormat*Å
_datadump_original_names¨D:@Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op6\:XGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op47*)
IsFeatureMapInputList	  	 2
 




BZGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGradV2-op92
Ñ

79 80Cast"OGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 




BZGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D/Cast-op235
¢

80 

12 81Conv2DBackpropFilter"OGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D*'
atomic_output_clean_indexs		  *

pri_format:NC1HWC0*
mode*
out_channel**
pad_list    *0
input_names!:out_backprop	:input*
stride**
dilation*
output_names 
:output*
group*
kernel_size*
groups*
pad_mode	:VALID*
data_format:NCHW*
pad *.
filter_sizes*
IsFeatureMapOutput*)
IsFeatureMapInputList	  	 2



BiGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D/Conv2DBackpropFilter-op48
ð

conv2.weight 

moments.conv2.weight 

learning_rate 

81 

momentum 82ApplyMomentum"Default/optimizer-Momentum*

pri_format	:FracZ*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op49


82 
	
cst29 83tuple_getitem"Default/optimizer-Momentum2



B.Default/optimizer-Momentum/tuple_getitem-op268


82 
	
cst30 84tuple_getitem"Default/optimizer-Momentum2



B.Default/optimizer-Momentum/tuple_getitem-op269
X

84 

83 85
make_tuple"Default2

BDefault/make_tuple-op83
g
	
cst31 

85 86Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op50
i

8 
	
cst32 87tuple_getitem"Default2
 



BDefault/tuple_getitem-op192
f

11 
	
cst33 88tuple_getitem"Default2
 


BDefault/tuple_getitem-op196
å

80 

2 89Conv2DBackpropInput"OGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D*
pad *
mode*
out_channel*
kernel_size*
stride**
dilation*
output_names 
:output*
group*
pad_mode	:VALID*
data_format:NCHW*
IsFeatureMapOutput*"
IsFeatureMapInputList		  **
pad_list    *1
input_names":out_backprop
:filter*-
input_sizes *

pri_format:DefaultFormat2
 


BhGradients/Default/network-WithLossCell/_backbone-LeNet5/conv2-Conv2d/gradConv2D/Conv2DBackpropInput-op52


10 

89 

88 90MaxPoolGradWithArgmax"bGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax*'
atomic_output_clean_indexs		  *0
IsFeatureMapInputList	  	 	 *

pri_format:NC1HWC0*)
strides*'
ksize*
padding	:VALID*<
input_names- :x_origin:
out_origin:grad*
output_names 
:output*
IsFeatureMapOutput2
 


B}Gradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax/MaxPoolGradWithArgmax-op53
÷

90 91Cast"bGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BmGradients/Default/network-WithLossCell/_backbone-LeNet5/max_pool2d-MaxPool2d/gradMaxPoolWithArgmax/Cast-op245
°

91 

87 92
ReluGradV2"JGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU*
_datadump_is_multiop*
IsFeatureMapOutput*

pri_format:DefaultFormat*Å
_datadump_original_names¨D:@Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/ReLU-op2\:XGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGrad-op54*)
IsFeatureMapInputList	  	 2
 


BZGradients/Default/network-WithLossCell/_backbone-LeNet5/relu-ReLU/gradReLU/ReluGradV2-op94
Ñ

92 93Cast"OGradients/Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/gradConv2D*
_datadump_original_names*"
IsFeatureMapInputList		  *
is_backed_cast*
IsFeatureMapOutput2
 


BZGradients/Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/gradConv2D/Cast-op246
¡

93 

5 94Conv2DBackpropFilter"OGradients/Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/gradConv2D*'
atomic_output_clean_indexs		  *

pri_format:NC1HWC0*
mode*
out_channel**
pad_list    *0
input_names!:out_backprop	:input*
stride**
dilation*
output_names 
:output*
group*
kernel_size*
groups*
pad_mode	:VALID*
data_format:NCHW*
pad *.
filter_sizes*
IsFeatureMapOutput*)
IsFeatureMapInputList	  	 2



BiGradients/Default/network-WithLossCell/_backbone-LeNet5/conv1-Conv2d/gradConv2D/Conv2DBackpropFilter-op55
ð

conv1.weight 

moments.conv1.weight 

learning_rate 

94 

momentum 95ApplyMomentum"Default/optimizer-Momentum*

pri_format	:FracZ*"
IsFeatureMapInputList		 *
use_locking *
use_nesterov *
gradient_scale-  ?*e
input_namesV :variable:accumulation:learning_rate:gradient:momentum*
output_names 
:output*
IsFeatureMapOutput2

B-Default/optimizer-Momentum/ApplyMomentum-op56


95 
	
cst34 96tuple_getitem"Default/optimizer-Momentum2



B.Default/optimizer-Momentum/tuple_getitem-op271


95 
	
cst35 97tuple_getitem"Default/optimizer-Momentum2



B.Default/optimizer-Momentum/tuple_getitem-op272
X

97 

96 98
make_tuple"Default2

BDefault/make_tuple-op86
g
	
cst36 

98 99Depend"Default/optimizer-Momentum2B&Default/optimizer-Momentum/Depend-op57
¿

99 

86 

70 

64 

56 

50 

42 

36 100
make_tuple"Default/optimizer-Momentum2$ 







B*Default/optimizer-Momentum/make_tuple-op58
[

28 
	
cst37 101tuple_getitem"Default2
 BDefault/tuple_getitem-op211
¸

101 102
ReduceMean"CDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits*

pri_format:NC1HWC0*
axis	 *
input_names:input_x*
	keep_dims *
output_names
 :y*'
atomic_output_clean_indexs		  *
	io_format:ND*"
IsFeatureMapInputList		  *
IsFeatureMapOutput2BSDefault/network-WithLossCell/_loss_fn-SoftmaxCrossEntropyWithLogits/ReduceMean-op60
E

102 

100 103Depend"Default2BDefault/Depend-op61
A

103 104
make_tuple"Default2"BDefault/make_tuple-op284kernel_graph_0!
args0
 

 
 
args1
 (
conv1.weight



(
conv2.weight





fc1.weight	
x

fc1.bias
x

fc2.weight
T
x
fc2.bias
T

fc3.weight


T
fc3.bias


learning_rate
momentum0
moments.conv1.weight



0
moments.conv2.weight



'
moments.fc1.weight	
x
 
moments.fc1.bias
x&
moments.fc2.weight
T
x 
moments.fc2.bias
T&
moments.fc3.weight


T 
moments.fc3.bias

"	
104"*
cst1B  ?(*
cst2B    (*
cst3 *
cst4 *
cst5 *
cst6 *
cst7*
cst8B   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   =   (*
cst9*
cst10 *
cst11	B(*
cst12*
cst13 *
cst14	B(*
cst15*
cst16 *
cst17	B(*
cst18*
cst19 *
cst20	B(*
cst21*
cst22 *
cst23	B(*
cst24*
cst25 *
cst26	B(*
cst27*
cst28*
cst29*
cst30 *
cst31	B(*
cst32*
cst33*
cst34*
cst35 *
cst36	B(*
cst37 