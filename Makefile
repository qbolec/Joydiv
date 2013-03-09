app: joydiv.js

%.js : %.ts *.ts
	tsc $< --out $@
