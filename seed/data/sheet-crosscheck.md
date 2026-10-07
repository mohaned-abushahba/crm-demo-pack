# Sheet vs opmsalescrm1 cross-check

Sheet: `Sales_CRM_Golden_Demo_Data_Template.xlsx`. opmsalescrm1 wins; fix the sheet, not the fixtures.

## Departments → `010-cmn_department`

5 sheet rows, 10 instance records, 0 sheet-only, 5 instance-only.

Instance-only (will be seeded, missing from sheet):
- pricing
- contracts
- finance
- order operations
- customer support

## Users_Personas → `030-sys_user`

52 sheet rows, 63 instance records, 1 sheet-only, 12 instance-only.

Sheet-only (not on opmsalescrm1, will not be seeded):
- maurice_atkins_ams_east_nc_tech_l5

Instance-only (will be seeded, missing from sheet):
- sandra shiny
- sofia andrade
- selena serrano_mw_ae
- morgan reyes_ship-apr-mgr_global
- alexander bell
- maurice atkins_ams_east_nc_tech_l5
- order admin
- lucas bennett
- order agent
- asher sky_boxeo
- external partner manager
- reese gupta

## Assignment_Groups → `040-sys_user_group`

25 sheet rows, 32 instance records, 9 sheet-only, 16 instance-only.

Sheet-only (not on opmsalescrm1, will not be seeded):
- scrm-catalog admin
- scrm-solution consultants
- scrm-solution consultant manager
- scrm-customer support team
- scrm-catalog manager
- scrm-contract management
- scrm-customer success team
- scrm-uber sales representative
- scrm-customer success manager

Instance-only (will be seeded, missing from sheet):
- account onboarding team
- scrm-employeeworks users
- scrm-solution consultants - not used
- scrm-catalog admin - not used
- scrm-l4 approver - not used
- scrm-catalog manager - not used
- scrm-delinquent account approver
- scrm-customer support team - not used
- scrm-l3 approver - not used
- scrm-l2 approver - not used
- scrm-customer success manager - not used
- scrm-uber sales representative - not used
- scrm-solution consultant manager - not used
- scrm-shipping escalations approver - not used
- scrm-contract management - not used
- scrm-customer success team - not used

## Accounts → `100-customer_account`

24 sheet rows, 27 instance records, 0 sheet-only, 3 instance-only.

Instance-only (will be seeded, missing from sheet):
- progantic inc.
- liberty lands
- nueva systems

## Contacts → `110-customer_contact`

66 sheet rows, 74 instance records, 0 sheet-only, 8 instance-only.

Instance-only (will be seeded, missing from sheet):
- david / sac
- jenny / jones
- gilbert / mardow
- john / smith
- lucy / smith
- dorothy / perkins
- colin / han
- derry / jones

## Account_Addresses → `020-cmn_location`

96 sheet rows, 100 instance records, 0 sheet-only, 4 instance-only.

Instance-only (will be seeded, missing from sheet):
- pinnacle dealer networks
- vertex solutions group
- augustus hq
- meridian systems partners

## Territories → `300-sn_tp_territory`

31 sheet rows, 31 instance records, 0 sheet-only, 0 instance-only.

## PRM_Partner Programs → `200-sn_prm_partner_program`

3 sheet rows, 3 instance records, 0 sheet-only, 0 instance-only.

## PRM_Segments → `190-sn_seg_segment`

3 sheet rows, 3 instance records, 0 sheet-only, 0 instance-only.

## PRM_Channel Partners → `210-sn_prm_channel_partner`

3 sheet rows, 3 instance records, 0 sheet-only, 0 instance-only.

## Product_Catalogs → `430-sn_prd_pm_product_offering_catalog`

3 sheet rows, 5 instance records, 1 sheet-only, 3 instance-only.

Sheet-only (not on opmsalescrm1, will not be seeded):
- events catalog

Instance-only (will be seeded, missing from sheet):
- conglomerate top-level
- conglomerate catalog
- data storage solution catalog

## Product_Categories → `435-sn_prd_pm_product_offering_category`

4 sheet rows, 15 instance records, 0 sheet-only, 11 instance-only.

Instance-only (will be seeded, missing from sheet):
- connectivity packages
- technology hardware
- technology software
- 
- data storage solution category
- dealer add-on products
- data storage configurable product
- cloud solutions
- top-level simple products
- pump hardware
- top-level configurable products

## Product_Families → `445-sn_prd_pm_product_offering_family`

4 sheet rows, 4 instance records, 0 sheet-only, 0 instance-only.

## Product_Offerings → `450-sn_prd_pm_product_offering`

106 sheet rows, 255 instance records, 0 sheet-only, 149 instance-only.

Instance-only (will be seeded, missing from sheet):
- raid level1
- case nuts 1
- cibrin71
- md3
- data repli1
- cloud sol1
- en19
- rack unit 1
- back up po1
- generators1
- galactic 41
- power chor1
- tuelna64
- futari70
- implementa1
- clelfu50
- bomepu23
- standard p1
- user acces2
- clpr42
- spbras81
- ecmaef59
- cable ties1
- md8
- automatic 1
- mu66
- 50ga51
- puma44
- tueldi58
- emstco68
- profession1
- fuprdi57
- bumu74
- inin(i27
- fuprpr60
- etglmi32
- napo45
- cibrin72
- 50ga55
- en16
- services1
- hardware1
- generator 1
- custom coo1
- all-in-one1
- 25ga52
- exwa90
- emergency 1
- kuiper 4 s1
- server cas1
- ad56
- power supp1
- fusy29
- tuelpr61
- power chor2
- support se1
- spar82
- standard f1
- solana int1
- diinec26
- en21
- adauen77
- al30
- cokiap76
- 25ga54
- pufuel47
- clfust49
- md5
- spco84
- en17
- spcl87
- ecul43
- pomafi48
- elecsubinst
- cooling1
- case wheel1
- cloud stor1
- futari80
- prprga37
- ecfupu46
- case bolts1
- cosy31
- software1
- md2
- oplo36
- networking1
- kuiper 2 s1
- case manag1
- gen
- hacoki75
- premium su1
- elecpmt
- cldipr41
- en22
- 50ga53
- md7
- enshal69
- prglmi33
- spark plug1
- tokens1
- en12
- prmu73
- en11
- en10
- md6
- svcs
- spbe85
- storage dr1
- server1
- tuhipr40
- datastora1
- activity l1
- two factor1
- silent fan1
- ecmaef62
- ecmaef65
- cosmic 2 s1
- fpg
- en18
- bomeec24
- futari79
- cosmic 6 s1
- galactic 61
- en14
- wa34
- accessorie1
- fuprna63
- ecprin39
- md1
- stwa89
- standard s1
- md9
- inin(i28
- cokidi67
- basic lice1
- buemst78
- diinpu25
- spsh86
- data reten1
- unlimited 1
- spst83
- en20
- md4
- cllo35
- en13
- spyo88
- en15
- prwa91
- ulprpr38

## Price_Lists → `500-sn_csm_pricing_price_list`

1 sheet rows, 2 instance records, 0 sheet-only, 1 instance-only.

Instance-only (will be seeded, missing from sheet):
- partner price list

## Price_List_Lines → `510-sn_csm_pricing_price_list_line`

104 sheet rows, 355 instance records, 0 sheet-only, 251 instance-only.

Instance-only (will be seeded, missing from sheet):
- pllstandar209
- ppl-7b8ef957
- pllstandar-fac33a9f07acbfdbcc6feb10e6d60dae
- ppl-717fbd53
- ppl-11ffbd93
- pllstandar127
- pllstandar106
- pllstandar154
- ppl-87bf3dd3
- pllstandar196
- pllstandar117
- ppl-bc018ad7
- pllstandar-6a234e71bc80722639fd778af7b35d1f
- pllstandar113
- ppl-5c4f7913
- pllstandar168
- pllstandar191
- pllstandar201
- ppl-1a800697
- pllstandar141
- pllstandar-5f86c9682b9747c9ad564c0791b7e0ff
- ppl-c7d04ed7
- pllstandar189
- ppl-1fcf7193
- pllstandar125
- pllstandar175
- ppl-aaa0ce97
- pllstandar119
- ppl-d2604a57
- ppl-79eef113
- pllstandar164
- pllstandar-6b5b4b9e4b79497b8fadd74ec02f3819
- pllstandar193
- pllstandar-b6f758ac3c7e6edc8ce171d34b9c17cb
- ppl-e38f3153
- pllstandar98
- ppl-43208ed3
- pllstandar185
- pllstandar199
- pllstandar102
- ppl-998f7993
- pllstandar174
- pllstandar-c2d19077cb5ef88bd13a69d08c55bb46
- ppl-3e21ce5b
- ppl-e27f3d93
- pllstandar120
- pllstandar-genrepman01
- pllstandar192
- pllstandar190
- ppl-ef5fb593
- pllstandar93
- pllstandar94
- ppl-d2cf7193
- ppl-4f6ff513
- pllstandar151
- pllstandar137
- pllstandar139
- pllstandar134
- pllstandar228
- ppl-5f300a57
- ppl-63504657
- pllstandar161
- ppl-4ae0025b
- pllstandar222
- ppl-e2deb19f
- ppl-3fbefd5f
- pllstandar105
- pllstandar123
- pllstandar206
- ppl-6a404e17
- pllstandar-2206190ce584ace8e9361d07d5ca921c
- pllstandar208
- pll-std-hpg29
- pllstandar138
- ppl-9830ced3
- ppl-e3900e97
- pllstandar118
- pllstandar188
- ppl-2c9f3153
- ppl-aa608e97
- pllstandar173
- pllstandar-126b2a608d17482bdf0a054c076bf2f3
- pllstandar-tokens0001
- ppl-2b20ced3
- pllstandar124
- ppl-b9e0ced7
- pllstandar167
- pllstandar178
- pllstandar108
- ppl-d0110a1b
- pllstandar165
- pllstandar187
- pllstandar181
- ppl-5f308a57
- pllstandar144
- ppl-6dfe795b
- ppl-cdcf3553
- ppl-73ffbd93
- pllstandar176
- pllstandar116
- pllstandar205
- ppl-60c0ce97
- pllstandar95
- ppl-184fbd53
- ppl-12b0461b
- pllstandar207
- ppl-4c00c257
- pllstandar99
- ppl-acfe799f
- pllstandar-4dff513aa673c62d9bb8f7546cec46aa
- pllstandar211
- pllstandar103
- ppl-db30c617
- pllstandar140
- pllstandar184
- ppl-343ff953
- pllstandar162
- ppl-090f3153
- pllstandar-139c39ecf0f2f827cc5410f9880b2709
- pllstandar-ecfb88dd2d461a547dde21736465da94
- ppl-51d0ca1b
- pllstandar136
- ppl-a4200e57
- pllstandar114
- ppl-c9b0821b
- ppl-4adfb593
- pllstandar145
- ppl-874f7913
- ppl-b69f3553
- pll-std-hpg61
- pllstandar-f751f65fabaf696befa591aaaa063b9a
- pllstandar159
- pllstandar156
- ppl-abeff917
- pllstandar130
- pllstandar115
- pllstandar-05569235b0d80220178aac316b1c09db
- pllstandar180
- pllstandar160
- pllstandar132
- ppl-8f408697
- pllstandar210
- ppl-9c2f3553
- pllstandar-5e318e5d5521859d0d6b205a808ef8e2
- pllstandar-b4bab648ca6f49014ca725d4726884ab
- pllstandar-002442d64968914ae91671992d5b3d8a
- pllstandar218
- ppl-8bceb19f
- pllstandar107
- ppl-fb2ff5df
- pllstandar170
- pllstandardhitech
- ppl-7e404e17
- pllstandar147
- ppl-836ff513
- pllstandar183
- pll-cas2201
- ppl-500fb95f
- pllstandar129
- ppl-28aff5d3
- ppl-fedfb517
- pllstandar158
- ppl-d0be3d5f
- pllstandar163
- pllstandar232
- pllstandar100
- ppl-b40082d3
- pllstandar198
- ppl-36504657
- pllstandar146
- ppl-231f35df
- pllstandar150
- pllstandar203
- ppl-70ef71df
- pllstandar96
- ppl-e99f7193
- ppl-3e704297
- pllstandar133
- pllstandar172
- ppl-1cdff193
- ppl-84aff513
- ppl-6f7e75df
- pllstandar142
- ppl-8c210a1b
- pllstandar214
- pllstandar-1c49ac085e185b89c8c07c516d25da56
- ppl-71508697
- pllstandar-7b3646a7a4e1bc5dd8b73ba937090984
- pllstandar109
- ppl-8f7f3d13
- ppl-f0aeb95f
- pllstandar200
- pllstandar131
- ppl-a700ca53
- pllstandar110
- pllstandar202
- pllstandar89
- pllstandar-d9dab9cf7d1a25b082d1627be82650ea
- ppl-80d0461b
- pllstandar148
- pllstandar112
- pllstandar153
- ppl-1e6fb593
- ppl-6e104257
- pllstandar126
- ppl-c45f799f
- pllstandar149
- ppl-e0bff9d3
- pllstandar169
- pllstandar166
- pllstandar197
- ppl-1ac0c6d7
- pllstandar128
- ppl-c2afb553
- pllstandar-ac75a6c710656c7798efb91ec674b275
- pllstandar195
- ppl-9410c657
- pllstandar121
- ppl-42a0ca97
- pllstandar155
- pllstandar215
- ppl-82f04ed7
- ppl-b6efb993
- pllstandar-5555521b8db206708d098349bafd86d1
- pllstandar204
- ppl-781ff153
- ppl-05908ad7
- pllstandar97
- pllstandar104
- ppl-bb60ce97
- ppl-441fb153
- pllstandar186
- pllstandar101
- ppl-bfbf7dd3
- ppl-fa5f7d13
- ppl-1b10c257
- pllstandar143
- pllstandar122
- pllstandar179
- ppl-cb00c2d3
- pllstandar157
- ppl-4eefb993
- ppl-f690cad7
- pllstandar135
- pllstandar-2d918b61058d81917f848b6e82c71309
- ppl-408046d7
- pllstandar194
- ppl-f7afb953
- pllstandar152
- pllstandar111
- ppl-35bff9d3
