type course = { name: string, id: number }
type student = { name: string, course: number }

type data_container = { "courses": course, "students": student }

type test<T extends keyof data_container & string, E extends data_container[T]> = Map<T, E>;


const data = {
	"courses": [{ name: "awesome", id: 2 }, { name: "test2", id: 2 }, { name: "awesome2", id: 1 }],
	"students": [{ name: "ryan", course: 2 }, { name: "casper", course: 2 }]
}


type joined<Left extends keyof data_container, Right extends keyof data_container> = {
	left: keyof data_container[Left],
	right: keyof data_container[Right]
}

const test: joined<"courses", "students"> = {
	left: "id",
	right: "course"
}

type Joins = {
	[v in keyof data_container]: {
		[x in keyof data_container]: joined<x, v>
	}
}
const joins: Joins = {
	students: {
		students: { left: "course", right: "course" },
		courses: test
	},
	courses: {
		students: { left: "course", right: "id" },
		courses: { left: "id", right: "id" }
	}
}



class ListModel<T extends keyof data_container, E extends data_container[T]> {
	reference: Array<E>
	at: number;
	name: T
	constructor(name: T) {
		this.reference = data[name] as [E]
		this.at = 0;
		this.name = name;
	}
	next = () => {
		let val = this.reference[this.at];
		this.at += 1;
		return val;
	};
	iterModel = () => new Iterator2Model(this.next, this.name, (v) => v)



	iter = () => new Iterator2(this.next)
}

class Iterator2Model<T extends keyof data_container, E extends data_container[T], V = data_container[T]> {
	value: () => E | null;
	name: T;
	last_filter: (v: E | null) => V;

	constructor(val: () => E | null, name: T, display: (v: E | null) => V) {
		this.value = val;
		this.name = name;
		this.last_filter = display;
	}

	Select<C2 extends keyof E>(...c: C2[]): Iterator2Model<T, E, { [x in typeof c[number]]: Array<C2>[number] }> {
		return new Iterator2Model(this.value, this.name, v => {
			let x: Partial<{ [x in typeof c[number]]: Array<C2>[number] }> = {};
			c.forEach(z => x = { ...x, [z]: v[z] });
			return x as { [x in typeof c[number]]: Array<C2>[number] }
		})
	}

	Where(func: (_: E) => boolean) {
		return new Iterator2Model(() => {
			while (true) {
				const val = this.value();
				if (val == undefined || func(val)) {
					return val;
				}
			}
		}, this.name, this.last_filter)
	}

	Include<X extends keyof data_container, Y>(
		table_to_join: X,
		fun: (v: Iterator2Model<X, data_container[X], data_container[X]>) => Iterator2Model<X, data_container[X], Y>
	): Iterator2Model<T, E, { [_ in X]: Y[] } & V> {
		const next = () => {
			const next = this.value();
			if (!next) {
				return undefined
			}
			const z = {
				[table_to_join]: fun(new ListModel(table_to_join).iterModel().Where(p => {
					const keys = joins[this.name][table_to_join];
					return next && p && next[keys.right] == p[keys.left]
				})).toList(),
				...next
			}
			return z
		}
		return new Iterator2Model(next, this.name, (current) => {
			let basic = this.last_filter(current);
			console.log(basic)
			let final = { [table_to_join]: current[table_to_join], ...basic };
			console.log(final)
			let final2 = final as V & { [_ in X] }
			console.log(final2)
			return final2;
		})
	}

	forEach = (func: (_: V) => void) => {
		while (true) {
			const next = this.value();
			if (next) {
				const v = this.last_filter(next);
				func(v);
			} else {
				break;
			}
		}
	};
	inspect = (func: (_: E) => void) =>
		new Iterator2Model(() => {
			let obj = this.value();
			if (obj == undefined) {
				return undefined;
			} else {
				func(obj);
				return obj;
			}
		}, this.name, this.last_filter);

	toList = (): Array<V> => {
		let list: V[] = [];
		while (true) {
			const v = this.value();
			if (v) {
				let basic = this.last_filter(v);
				list.push(basic)
			} else {
				return list
			}
		}
	}
}

class List<T> {
	value: [T];
	at: number;
	constructor(value: [T]) {
		this.value = value;
		this.at = 0;
	}
	next = () => {
		let val = this.value[this.at];
		this.at += 1;
		return val;
	};
	iter = () => new Iterator2(this.next)

}
class Iterator2<T> {
	value: () => T | null;

	constructor(val: () => T | null) {
		this.value = val;
	}

	next = () => this.value();

	map = <T2>(func: (_: T) => T2) =>
		new Iterator2(() => {
			let obj = this.next();
			if (obj == undefined) {
				return undefined;
			}
			return func(obj);
		});

	filter = (func: (_: T) => boolean) =>
		new Iterator2(() => {
			while (true) {
				const val = this.next();
				if (val == undefined || func(val)) {
					return val;
				}
			}
		});

	find = (func: (_: T) => boolean) => {
		while (true) {
			const obj = this.next();
			if (obj == undefined) {
				return undefined;
			}
			if (func(obj)) {
				return obj;
			}
		}
	};
	inspect = (func: (_: T) => void) =>
		new Iterator2(() => {
			let obj = this.next();
			if (obj == undefined) {
				return undefined;
			} else {
				func(obj);
				return obj;
			}
		});
	forEach = (func: (_: T) => void) => {
		while (true) {
			const next = this.next();
			if (next) {
				func(next);
			} else {
				break;
			}
		}
	};
	Select = <C2 extends keyof T>(
		...c: Array<C2>
	): Iterator2<Pick<T, typeof c[number]>> => new Iterator2(this.next);

    /*
    GroupBy = <C2 extends keyof T>(
        ...c: Array<C2>
    ): Iterator2<{ key: Pick<T, typeof c[number]>; value: List<T> }> => {
        const items: Array<{
            key: Pick<T, typeof c[number]>;
            value: Array<T>;
        }> = [];
        while (true) {
            const obj = this.next();
            if (obj == undefined) {
                return new List(
                    items.map(v => ({ key: v.key, value: new List(v.value) }))
                ).iter();
            }
            const index = items.findIndex(v =>
                c.every(key => obj[key] == v.key[key])
            );
            if (index == -1) {
                items.push({ key: obj, value: [obj] });
            } else {
                items[index].value.push(obj);
            }
        }
    };*/
}

//console.log(new ListModel("courses").iterModel().where((c) => c.name == "geert").value())
new ListModel("courses")
	.iterModel()
	.Select("name")
	.Include(
		"students",
		(v) => v.Where(v => v.name == "a").Select("name")
	)
	.forEach(
		v => console.log(v.students)
	)


/*
new List([
    { userId: 1, listId: 1, name: "string1" },
    { userId: 1, listId: 2, name: "string2" },
    { userId: 2, listId: 2, name: "string3" },
    { userId: 1, listId: 1, name: "string4" },
    { userId: 1, listId: 2, name: "string5" },
    { userId: 2, listId: 2, name: "string6" },
])
    .iter()
    .GroupBy("userId", "listId")
    .map((v) => ({
        nice: "awesome",
        listId: v.key.listId,
        val: v.value
    }))
    .Select("nice")
    .forEach((v) => {
        console.log(v.nice)
    })
*/